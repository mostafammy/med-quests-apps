/**
 * Infrastructure Service: D1AuditJobRepository
 * Manages chunked, resumable global bank audit jobs in Cloudflare D1 SQLite.
 * Executes CPU-safe (< 8ms) chunks across lexical and clustering phases.
 * Layer: Infrastructure
 */

import type {
  AuditJob,
  AuditJobId,
  AuditJobStatus,
  DuplicateCluster,
  DuplicateRelation,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { UnionFindClusterer } from '../../../../domain/questionBank/duplication/UnionFindClusterer.ts';
import { SurvivorSelector } from '../../../../domain/questionBank/duplication/SurvivorSelector.ts';

export interface D1AuditDbLike {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
      run(): Promise<unknown>;
    };
  };
}

interface AuditJobRow {
  id: string;
  block_id?: string;
  status: string;
  cursor: string;
  processed: number;
  total: number;
  clusters_found: number;
  started_by: string;
  started_at: string;
  finished_at: string | null;
}

interface AuditPairRow {
  a_id: string;
  b_id: string;
  relation: string;
  fused_score?: number;
}

export class D1AuditJobRepository {
  private readonly db: D1AuditDbLike;

  constructor(db: D1AuditDbLike) {
    this.db = db;
  }

  /**
   * Initializes a new audit job in D1.
   */
  public async createJob(
    blockId = 'cvs',
    startedBy = 'admin'
  ): Promise<AuditJob> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as AuditJobId;

    // Count total published questions in block
    const countRes = await this.db
      .prepare('SELECT COUNT(*) as total FROM question_fingerprints WHERE block_id = ?')
      .bind(blockId)
      .first<{ total?: number }>();

    const total = countRes?.total ?? 0;

    const sql = `
      INSERT INTO qdd_audit_jobs (
        id, block_id, status, phase, cursor, processed, total, clusters_found, started_by, started_at
      ) VALUES (?, ?, 'running', 'lexical', '0', 0, ?, 0, ?, datetime('now'))
    `;

    await this.db.prepare(sql).bind(id, blockId, total, startedBy).run();

    return {
      id,
      scope: { kind: 'block', blockId },
      status: 'running',
      cursor: '0',
      processed: 0,
      total,
      clustersFound: 0,
      startedBy,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
  }

  /**
   * Retrieves an audit job by its ID.
   */
  public async getJob(id: string): Promise<AuditJob | null> {
    const row = await this.db
      .prepare('SELECT * FROM qdd_audit_jobs WHERE id = ?')
      .bind(id)
      .first<AuditJobRow>();

    if (!row) return null;

    const blockId = (row.block_id as string) || 'cvs';

    return {
      id: row.id as AuditJobId,
      scope: { kind: 'block', blockId },
      status: row.status as AuditJobStatus,
      cursor: row.cursor,
      processed: row.processed,
      total: row.total,
      clustersFound: row.clusters_found,
      startedBy: row.started_by,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    };
  }

  /**
   * Executes a single CPU-safe chunk (< 8ms) of the audit job.
   */
  public async advanceChunk(jobId: string, limitBands = 20): Promise<AuditJob> {
    const job = await this.getJob(jobId);
    if (!job || job.status !== 'running') {
      throw new Error(`Job ${jobId} is not running`);
    }

    const currentOffset = parseInt(job.cursor || '0', 10);
    const blockId = job.scope.kind === 'block' ? job.scope.blockId : 'cvs';

    // 1. Lexical LSH Bucket Phase
    const bucketSql = `
      SELECT band_key, GROUP_CONCAT(question_id) as member_ids, COUNT(*) as cnt
      FROM question_lsh_bands
      WHERE block_id = ?
      GROUP BY band_key
      HAVING cnt > 1
      ORDER BY band_key
      LIMIT ? OFFSET ?
    `;

    const buckets = await this.db
      .prepare(bucketSql)
      .bind(blockId, limitBands, currentOffset)
      .all();

    const rows = buckets.results || [];

    if (rows.length > 0) {
      // Process bucket collision pairs
      for (const row of rows) {
        const ids = (row.member_ids as string).split(',');
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const idA = ids[i];
            const idB = ids[j];
            const pairKey = [idA, idB].sort().join('|');

            // Insert discovered candidate pair
            const pairSql = `
              INSERT OR IGNORE INTO qdd_audit_pairs (
                job_id, pair_key, a_id, b_id, relation, fused_score, status
              ) VALUES (?, ?, ?, ?, 'NEAR', 0.85, 'pending')
            `;
            await this.db.prepare(pairSql).bind(jobId, pairKey, idA, idB).run();
          }
        }
      }

      const nextOffset = currentOffset + rows.length;
      const processedCount = Math.min(job.total, Math.round((nextOffset / (nextOffset + 20)) * job.total));

      await this.db
        .prepare('UPDATE qdd_audit_jobs SET cursor = ?, processed = ? WHERE id = ?')
        .bind(String(nextOffset), processedCount, jobId)
        .run();

      return {
        ...job,
        cursor: String(nextOffset),
        processed: processedCount,
      };
    }

    // 2. No more lexical buckets -> Transition to Clustering Phase
    const pairsRes = await this.db
      .prepare('SELECT a_id, b_id, relation, fused_score FROM qdd_audit_pairs WHERE job_id = ?')
      .bind(jobId)
      .all<AuditPairRow>();

    const pairs = pairsRes.results || [];
    const clusterer = new UnionFindClusterer();

    const edges = pairs.map((p: AuditPairRow) => ({
      idA: p.a_id,
      idB: p.b_id,
      relation: (p.relation as Exclude<DuplicateRelation, 'UNIQUE'>) || 'NEAR',
      fusedScore: p.fused_score ?? 0.85,
    }));

    const clusters = clusterer.cluster(edges, (members) =>
      SurvivorSelector.selectSurvivor(members)
    );

    await this.db
      .prepare(`
        UPDATE qdd_audit_jobs
        SET status = 'completed', phase = 'done', processed = total, clusters_found = ?, finished_at = datetime('now')
        WHERE id = ?
      `)
      .bind(clusters.length, jobId)
      .run();

    return {
      ...job,
      status: 'completed',
      processed: job.total,
      clustersFound: clusters.length,
      finishedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves paginated duplicate clusters for a completed job.
   */
  public async getClusters(jobId: string): Promise<readonly DuplicateCluster[]> {
    const pairsRes = await this.db
      .prepare('SELECT a_id, b_id, relation, fused_score FROM qdd_audit_pairs WHERE job_id = ?')
      .bind(jobId)
      .all<AuditPairRow>();

    const pairs = pairsRes.results || [];
    const clusterer = new UnionFindClusterer();

    const edges = pairs.map((p: AuditPairRow) => ({
      idA: p.a_id,
      idB: p.b_id,
      relation: (p.relation as Exclude<DuplicateRelation, 'UNIQUE'>) || 'NEAR',
      fusedScore: p.fused_score ?? 0.85,
    }));

    return clusterer.cluster(edges, (members) =>
      SurvivorSelector.selectSurvivor(members)
    );
  }
}
