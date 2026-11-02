/**
 * Stage 6: Bounded LLM Arbitration
 * Strictly dispatched for unresolved edge-case pairs inside the ambiguity zone.
 * Memoizes verdicts into IPairVerdictCache so no pair is ever evaluated twice.
 * Layer: Domain (Stages)
 */

import type {
  DetectionContext,
  IDetectionStage,
  ILlmDuplicateArbiter,
  IPairVerdictCache,
  QddStageId,
  SimilaritySignals,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { createPairKey } from '../pairKey.ts';

export class S6LlmArbiterStage implements IDetectionStage {
  public readonly id: QddStageId = 'S6_LLM_ARBITER';
  public readonly timeoutMs = 2500;
  private readonly arbiter: ILlmDuplicateArbiter | null;
  private readonly cache: IPairVerdictCache | null;
  private readonly enabled: boolean;

  constructor(
    arbiter: ILlmDuplicateArbiter | null,
    cache: IPairVerdictCache | null,
    enabled = true
  ) {
    this.arbiter = arbiter;
    this.cache = cache;
    this.enabled = enabled;
  }

  public async execute(context: DetectionContext): Promise<void> {
    if (context.final || !this.enabled || !this.arbiter) {
      return;
    }

    const { subject, signal } = context;

    for (const [matchedId, cand] of context.candidates.entries()) {
      if (cand.relation !== null) continue; // Already decided by earlier stage

      const pairKey = await createPairKey(subject.questionId, matchedId);

      // 1. Check pair cache first (zero LLM token cost on repeat checks)
      if (this.cache) {
        const cached = await this.cache.get(pairKey);
        if (cached) {
          cand.relation = cached.relation;
          cand.decidedBy = this.id;
          cand.llm = cached;
          continue;
        }
      }

      // If canonical question details are unavailable for candidate, skip LLM
      if (!cand.canonical) continue;

      const signals: SimilaritySignals = {
        lexicalJaccard: cand.lexicalJaccard,
        semanticCosine: cand.semanticCosine,
        rerankScore: cand.rerankScore,
        sameAnswerKey: cand.fingerprint.answerKeyHash === subject.answerKeyHash,
        discriminatorDelta: [],
        fusedScore: cand.semanticCosine ?? 0.85,
      };

      const result = await this.arbiter.arbitrate(subject, cand.canonical, signals, signal);

      if (result.ok) {
        cand.relation = result.value.relation;
        cand.decidedBy = this.id;
        cand.llm = result.value;

        // Memoize into pair verdict cache
        if (this.cache) {
          await this.cache.put(pairKey, result.value);
        }
      } else {
        context.degradedReasons.push(result.error);
      }
    }

    context.stagesExecuted.push(this.id);
  }
}
