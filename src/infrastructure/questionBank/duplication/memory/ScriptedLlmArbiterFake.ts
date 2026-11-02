/**
 * Infrastructure Fake: Scripted LLM Duplicate Arbiter
 * Used for deterministic testing of Stage 6 LLM arbitration logic.
 */

import { ok, type Result } from '../../../../domain/shared/result.ts';
import type {
  CanonicalQuestion,
  ClinicalDiscriminator,
  ILlmDuplicateArbiter,
  LlmArbiterVerdict,
  QddDegradationReason,
  SimilaritySignals,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class ScriptedLlmArbiterFake implements ILlmDuplicateArbiter {
  private readonly scriptedVerdicts = new Map<string, LlmArbiterVerdict>();

  public setVerdict(questionIdA: string, questionIdB: string, verdict: LlmArbiterVerdict): void {
    const key = `${questionIdA}:${questionIdB}`;
    this.scriptedVerdicts.set(key, verdict);
    const revKey = `${questionIdB}:${questionIdA}`;
    this.scriptedVerdicts.set(revKey, verdict);
  }

  public async arbitrate(
    a: CanonicalQuestion,
    b: CanonicalQuestion,
    signals: SimilaritySignals,
    signal?: AbortSignal
  ): Promise<Result<LlmArbiterVerdict, QddDegradationReason>> {
    if (signal?.aborted) {
      return ok({
        relation: 'UNIQUE',
        confidence: 0.5,
        rationale: 'Aborted',
        modelId: 'scripted-fake',
        promptVersion: 'v1',
      });
    }

    const key = `${a.questionId}:${b.questionId}`;
    const scripted = this.scriptedVerdicts.get(key);
    if (scripted) {
      return ok(scripted);
    }

    // Default heuristic fallback for unscripted tests:
    // If discriminator delta exists -> SIBLING
    if (signals.discriminatorDelta.length > 0) {
      return ok({
        relation: 'SIBLING',
        confidence: 0.95,
        rationale: `Clinical discriminator discrepancy: ${signals.discriminatorDelta.map((d: ClinicalDiscriminator) => d.token).join(', ')}`,
        modelId: 'scripted-fake',
        promptVersion: 'v1',
      });
    }

    // If answer keys differ -> CONFLICT
    if (!signals.sameAnswerKey) {
      return ok({
        relation: 'CONFLICT',
        confidence: 0.98,
        rationale: 'Contradictory correct answers for near-identical clinical presentation.',
        modelId: 'scripted-fake',
        promptVersion: 'v1',
      });
    }

    // High fused score with same key -> NEAR
    if (signals.fusedScore >= 0.75) {
      return ok({
        relation: 'NEAR',
        confidence: 0.92,
        rationale: 'Paraphrased formulation of the same underlying clinical question.',
        modelId: 'scripted-fake',
        promptVersion: 'v1',
      });
    }

    return ok({
      relation: 'UNIQUE',
      confidence: 0.85,
      rationale: 'Pedagogically distinct clinical concepts.',
      modelId: 'scripted-fake',
      promptVersion: 'v1',
    });
  }
}
