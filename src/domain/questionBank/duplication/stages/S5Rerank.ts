/**
 * Stage 5: Cross-Encoder Neural Reranking
 * Dispatched strictly for ambiguous candidates falling within the calibrated boundary band.
 * Layer: Domain (Stages)
 */

import type {
  DetectionContext,
  IDetectionStage,
  IPairReranker,
  QddStageId,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class S5RerankStage implements IDetectionStage {
  public readonly id: QddStageId = 'S5_RERANK';
  public readonly timeoutMs = 450;
  private readonly reranker: IPairReranker | null;
  private readonly enabled: boolean;

  constructor(reranker: IPairReranker | null, enabled = true) {
    this.reranker = reranker;
    this.enabled = enabled;
  }

  public async execute(context: DetectionContext): Promise<void> {
    if (context.final || !this.enabled || !this.reranker) {
      return;
    }

    const { subject, thresholds, signal } = context;

    // Filter candidates strictly in ambiguity band
    const ambiguousCandidates = Array.from(context.candidates.values()).filter(
      (c) => c.relation === null || (c.rerankScore === null && (c.semanticCosine ?? 0) >= 0.70)
    );

    if (ambiguousCandidates.length === 0) return;

    const candidateTexts = ambiguousCandidates.map(
      (c) => c.canonical?.embeddingText || c.fingerprint.stemHash
    );

    const scoreRes = await this.reranker.score(subject.embeddingText, candidateTexts, signal);
    if (!scoreRes.ok) {
      context.degradedReasons.push(scoreRes.error);
      return;
    }

    for (let i = 0; i < ambiguousCandidates.length; i++) {
      const cand = ambiguousCandidates[i];
      const rerankScore = scoreRes.value[i] ?? 0.5;
      cand.rerankScore = rerankScore;

      const sameAnswerKey = cand.fingerprint.answerKeyHash === subject.answerKeyHash;

      if (rerankScore >= thresholds.nearAutoMin) {
        cand.relation = sameAnswerKey ? 'NEAR' : 'CONFLICT';
        cand.decidedBy = this.id;
      }
    }

    context.stagesExecuted.push(this.id);
  }
}
