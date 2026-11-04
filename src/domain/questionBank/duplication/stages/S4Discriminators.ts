/**
 * Stage 4: Clinical Discriminators & Answer-Key Gate
 * Layer: Domain (Pure, Deterministic, 0 I/O)
 *
 * Deterministic final authority over models:
 * 1. Discriminator Delta -> SIBLING (never duplicate)
 * 2. High similarity + Different Answer Key -> CONFLICT (P2 medical-accuracy alarm)
 * 3. High similarity + Same Answer Key -> NEAR (or passes to S5/S6 if in ambiguity band)
 */

import type {
  DetectionContext,
  IDetectionStage,
  QddStageId,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { ClinicalDiscriminatorExtractor } from '../ClinicalDiscriminatorExtractor.ts';
import { LogisticScoreFusion } from '../LogisticScoreFusion.ts';
import { isAnswerKeySemanticallyEqual } from '../answerKeySemantics.ts';

export class S4DiscriminatorsStage implements IDetectionStage {
  public readonly id: QddStageId = 'S4_DISCRIMINATORS';
  public readonly timeoutMs = 150;

  public async execute(context: DetectionContext): Promise<void> {
    if (context.final) return;

    const { subject, thresholds } = context;

    for (const [candId, cand] of context.candidates.entries()) {
      // If already decided by S1 (e.g. EXACT or stem+key match), skip
      if (cand.decidedBy === 'S1_EXACT' || cand.relation === 'EXACT') continue;

      // 1. Compute clinical discriminator delta
      const delta = ClinicalDiscriminatorExtractor.computeDelta(
        subject.discriminators,
        cand.fingerprint.discriminators
      );

      // Rule A: If clinical discriminators differ (e.g. NOT injected, left vs right) -> SIBLING
      if (delta.length > 0) {
        cand.relation = 'SIBLING';
        cand.decidedBy = this.id;
        continue;
      }

      // 2. Discriminators are identical. Check answer keys.
      const sameAnswerKey =
        subject.answerKeyHash === cand.fingerprint.answerKeyHash ||
        (cand.fingerprint.canonicalCorrectAnswer && subject.canonicalCorrectAnswer
          ? isAnswerKeySemanticallyEqual(
              subject.canonicalCorrectAnswer,
              cand.fingerprint.canonicalCorrectAnswer
            )
          : false);

      // Rule B: Discriminators match, but answer keys differ on high similarity -> CONFLICT
      const similaritySignal = Math.max(cand.lexicalJaccard ?? 0, cand.semanticCosine ?? 0);
      if (!sameAnswerKey && similaritySignal >= 0.5) {
        cand.relation = 'CONFLICT';
        cand.decidedBy = this.id;
        continue;
      }

      // 3. Compute score fusion
      const fusedScore = LogisticScoreFusion.fuse({
        jaccard: cand.lexicalJaccard,
        cosine: cand.semanticCosine,
        rerank: cand.rerankScore,
        sameAnswerKey,
        sameTopic: subject.chapterId === cand.fingerprint.chapterId,
        lengthRatio: 1.0,
        discriminatorDeltaCount: delta.length,
      });

      // Rule C: High fused score with identical answer key -> Auto-NEAR
      if (fusedScore >= thresholds.nearAutoMin && sameAnswerKey) {
        cand.relation = 'NEAR';
        cand.decidedBy = this.id;
      } else if (fusedScore < thresholds.uniqueAutoMax) {
        // Drop candidate below unique threshold
        context.candidates.delete(candId);
      }
    }
  }
}
