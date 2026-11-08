/**
 * Domain Service: ClientQddAuditRunner
 * High-performance, offline-first Question Duplication Detection Audit Runner
 *
 * Implements non-blocking chunked scanning (< 8ms CPU safe) in browser environments:
 * 1. Canonicalizes items & generates 128 MinHash permutations
 * 2. Indexes 32 LSH bands & discovers collision candidates
 * 3. Compares pairs for EXACT, CONFLICT, NEAR, and SIBLING equivalence
 * 4. Partitions candidate pairs into discrete clusters with Union-Find
 * 5. Deterministically elects canonical survivors via SurvivorSelector
 *
 * Layer: Domain (Zero Network I/O, Pure & Deterministic)
 */

import type { Question } from '../../model/types.ts';
import type {
  AuditJob,
  AuditJobId,
  DuplicateCluster,
  DuplicateRelation,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { QuestionCanonicalizerV2 } from './QuestionCanonicalizerV2.ts';
import { MinHasher } from './MinHasher.ts';
import { UnionFindClusterer, type DuplicateEdge } from './UnionFindClusterer.ts';
import { SurvivorSelector, type CandidateQuestionMetadata } from './SurvivorSelector.ts';

export interface AuditProgress {
  readonly processed: number;
  readonly total: number;
  readonly clustersFound: number;
  readonly phase: 'canonicalizing' | 'indexing' | 'clustering' | 'completed';
}

export interface ClientAuditResult {
  readonly job: AuditJob;
  readonly clusters: readonly DuplicateCluster[];
}

export class ClientQddAuditRunner {
  private readonly canonicalizer = new QuestionCanonicalizerV2();
  private readonly minHasher = new MinHasher();

  /**
   * Executes a full bank audit asynchronously with Apple-grade fluid progress updates
   */
  public async runAudit(
    questions: readonly Question[],
    blockId = 'cvs',
    onProgress?: (progress: AuditProgress) => void,
    options: {
      chunkSliceSize?: number;
      sliceDelayMs?: number;
    } = {}
  ): Promise<ClientAuditResult> {
    const total = questions.length;
    const chunkSliceSize = options.chunkSliceSize ?? 25;
    const sliceDelayMs = options.sliceDelayMs ?? 15;
    const startTime = new Date().toISOString();
    const jobId = `local-audit-${Date.now()}` as AuditJobId;

    if (total === 0) {
      const emptyJob: AuditJob = {
        id: jobId,
        scope: { kind: 'block', blockId },
        status: 'completed',
        cursor: '0',
        processed: 0,
        total: 0,
        clustersFound: 0,
        startedBy: 'local-runner',
        startedAt: startTime,
        finishedAt: new Date().toISOString(),
      };
      return { job: emptyJob, clusters: [] };
    }

    onProgress?.({
      processed: 0,
      total,
      clustersFound: 0,
      phase: 'canonicalizing',
    });

    // 1. Canonicalize and generate MinHash signatures in CPU-safe slices
    type PreparedQuestion = {
      readonly id: string;
      readonly stemHash: string;
      readonly answerKeyHash: string;
      readonly signature: Uint32Array;
      readonly bandKeys: readonly string[];
      readonly metadata: CandidateQuestionMetadata;
    };

    const preparedItems: PreparedQuestion[] = [];
    const metadataMap = new Map<string, CandidateQuestionMetadata>();

    for (let i = 0; i < total; i += chunkSliceSize) {
      const slice = questions.slice(i, i + chunkSliceSize);

      for (const q of slice) {
        const canonical = await this.canonicalizer.canonicalize(q);
        const signature = this.minHasher.signature(canonical.shingles);
        const bandKeys = this.minHasher.bandKeys(signature);

        const qWithEditorial = q as Question & {
          editorialStatus?: 'published' | 'flagged' | 'archived';
          createdAt?: string;
        };
        const metadata: CandidateQuestionMetadata = {
          id: q.id,
          status: q.status,
          editorialStatus: qWithEditorial.editorialStatus,
          evidenceCount: q.evidence?.length ?? 0,
          attemptCount: 0,
          createdAt: qWithEditorial.createdAt,
        };

        metadataMap.set(q.id, metadata);

        preparedItems.push({
          id: q.id,
          stemHash: canonical.stemHash,
          answerKeyHash: canonical.answerKeyHash,
          signature,
          bandKeys,
          metadata,
        });
      }

      const processedCount = Math.min(total, i + slice.length);
      onProgress?.({
        processed: processedCount,
        total,
        clustersFound: 0,
        phase: 'canonicalizing',
      });

      // Yield CPU to the UI loop
      await new Promise((resolve) => setTimeout(resolve, sliceDelayMs));
    }

    onProgress?.({
      processed: total,
      total,
      clustersFound: 0,
      phase: 'indexing',
    });

    // 2. Index LSH Band Buckets to discover collision candidate pairs
    const bandBuckets = new Map<string, string[]>();
    for (const item of preparedItems) {
      for (const bKey of item.bandKeys) {
        let bucket = bandBuckets.get(bKey);
        if (!bucket) {
          bucket = [];
          bandBuckets.set(bKey, bucket);
        }
        bucket.push(item.id);
      }
    }

    // Collect candidate pairs that collide on >= 1 band
    const candidatePairKeys = new Set<string>();
    const collidingPairs: Array<{ idA: string; idB: string }> = [];

    for (const bucket of bandBuckets.values()) {
      if (bucket.length < 2) continue;
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const idA = bucket[i];
          const idB = bucket[j];
          if (idA === idB) continue;
          const pairKey = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
          if (!candidatePairKeys.has(pairKey)) {
            candidatePairKeys.add(pairKey);
            collidingPairs.push({ idA, idB });
          }
        }
      }
    }

    // 3. Score candidate pairs
    const itemMap = new Map(preparedItems.map((item) => [item.id, item]));
    const duplicateEdges: DuplicateEdge[] = [];

    for (const pair of collidingPairs) {
      const itemA = itemMap.get(pair.idA);
      const itemB = itemMap.get(pair.idB);
      if (!itemA || !itemB) continue;

      let relation: Exclude<DuplicateRelation, 'UNIQUE'> | null = null;
      let fusedScore = 0;

      if (itemA.stemHash === itemB.stemHash) {
        if (itemA.answerKeyHash === itemB.answerKeyHash) {
          relation = 'EXACT';
          fusedScore = 1.0;
        } else {
          relation = 'CONFLICT';
          fusedScore = 0.95;
        }
      } else {
        const jaccard = MinHasher.estimateJaccard(itemA.signature, itemB.signature);
        if (jaccard >= 0.70) {
          relation = 'NEAR';
          fusedScore = Number(jaccard.toFixed(3));
        } else if (jaccard >= 0.50) {
          relation = 'SIBLING';
          fusedScore = Number(jaccard.toFixed(3));
        }
      }

      if (relation) {
        duplicateEdges.push({
          idA: pair.idA,
          idB: pair.idB,
          relation,
          fusedScore,
        });
      }
    }

    onProgress?.({
      processed: total,
      total,
      clustersFound: 0,
      phase: 'clustering',
    });

    // 4. Cluster using Union-Find and elect survivors
    const clusterer = new UnionFindClusterer();
    const clusters = clusterer.cluster(duplicateEdges, (members) =>
      SurvivorSelector.selectSurvivor(members, metadataMap)
    );

    const completedJob: AuditJob = {
      id: jobId,
      scope: { kind: 'block', blockId },
      status: 'completed',
      cursor: String(total),
      processed: total,
      total,
      clustersFound: clusters.length,
      startedBy: 'local-runner',
      startedAt: startTime,
      finishedAt: new Date().toISOString(),
    };

    onProgress?.({
      processed: total,
      total,
      clustersFound: clusters.length,
      phase: 'completed',
    });

    return {
      job: completedJob,
      clusters,
    };
  }
}
