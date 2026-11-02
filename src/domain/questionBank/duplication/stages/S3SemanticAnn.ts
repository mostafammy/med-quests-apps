/**
 * Stage 3: Dense Vector Semantic ANN Search
 * Performs approximate nearest neighbor search using Cloudflare Vectorize (HNSW)
 * and dense embeddings generated via Workers AI (@cf/baai/bge-small-en-v1.5).
 * Layer: Domain (Stages)
 */

import type {
  DetectionContext,
  IDetectionStage,
  IEmbeddingProvider,
  IVectorIndex,
  IFingerprintRepository,
  QddStageId,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class S3SemanticAnnStage implements IDetectionStage {
  public readonly id: QddStageId = 'S3_SEMANTIC_ANN';
  public readonly timeoutMs = 350;
  private readonly embeddingProvider: IEmbeddingProvider;
  private readonly vectorIndex: IVectorIndex;
  private readonly repo?: IFingerprintRepository;

  constructor(
    embeddingProvider: IEmbeddingProvider,
    vectorIndex: IVectorIndex,
    repo?: IFingerprintRepository
  ) {
    this.embeddingProvider = embeddingProvider;
    this.vectorIndex = vectorIndex;
    this.repo = repo;
  }

  public async execute(context: DetectionContext): Promise<void> {
    if (context.final) return;

    const { subject, scope, thresholds, signal } = context;

    // 1. Generate dense 384-d embedding for canonical embedding text (stem + correct answer)
    const embedRes = await this.embeddingProvider.embed([subject.embeddingText], signal);
    if (!embedRes.ok) {
      context.degradedReasons.push(embedRes.error);
      return;
    }

    const queryVector = embedRes.value[0];
    if (!queryVector) {
      context.degradedReasons.push('EMBEDDING_UNAVAILABLE');
      return;
    }

    // 2. Query Vectorize HNSW Index
    const searchRes = await this.vectorIndex.query(
      queryVector,
      scope,
      thresholds.maxCandidatesPerStage,
      signal
    );

    if (!searchRes.ok) {
      context.degradedReasons.push(searchRes.error);
      return;
    }

    // 3. Merge Vector Matches with Existing LSH Candidates
    for (const match of searchRes.value) {
      if (match.questionId === subject.questionId) continue;

      const existing = context.candidates.get(match.questionId);
      if (existing) {
        existing.semanticCosine = match.cosine;
      } else if (match.cosine >= thresholds.semanticCandidateMin && this.repo?.findById) {
        // Discovered via dense semantic search alone
        const fp = await this.repo.findById(match.questionId);
        if (fp) {
          context.candidates.set(match.questionId, {
            fingerprint: fp,
            canonical: null,
            lexicalJaccard: null,
            semanticCosine: match.cosine,
            rerankScore: null,
            relation: null,
            decidedBy: null,
            llm: null,
          });
        }
      }
    }

    context.stagesExecuted.push(this.id);
  }
}
