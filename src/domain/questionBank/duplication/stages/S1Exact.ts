/**
 * Stage 1: Deterministic Exact Hash Sieve
 * Evaluates 256-bit cryptographic item and stem hash collisions.
 * The ONLY stage that can trigger an authoritative BLOCK decision.
 */

import type {
  DetectionContext,
  IDetectionStage,
  IFingerprintRepository,
  QddStageId,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { isAnswerKeySemanticallyEqual } from '../answerKeySemantics.ts';

export class S1ExactStage implements IDetectionStage {
  public readonly id: QddStageId = 'S1_EXACT';
  public readonly timeoutMs = 250;
  private readonly repo: IFingerprintRepository;

  constructor(repo: IFingerprintRepository) {
    this.repo = repo;
  }

  public async execute(context: DetectionContext): Promise<void> {
    const { subject, scope } = context;

    // 1. Check exact ItemHash collision (identical stem + choices + answer key)
    const exactItemHits = await this.repo.findByItemHash(scope, subject.itemHash);

    for (const hit of exactItemHits) {
      if (hit.questionId !== subject.questionId) {
        context.candidates.set(hit.questionId, {
          fingerprint: hit,
          canonical: null,
          lexicalJaccard: 1.0,
          semanticCosine: 1.0,
          rerankScore: 1.0,
          relation: 'EXACT',
          decidedBy: this.id,
          llm: null,
        });

        // Exact item found -> terminal short-circuit
        context.final = true;
        return;
      }
    }

    // 2. Check StemHash collision (identical stem)
    const exactStemHits = await this.repo.findByStemHash(scope, subject.stemHash);

    for (const hit of exactStemHits) {
      if (hit.questionId !== subject.questionId) {
        const isSameKeyHash = hit.answerKeyHash === subject.answerKeyHash;
        const isSemanticKeyMatch =
          isSameKeyHash ||
          (hit.canonicalCorrectAnswer && subject.canonicalCorrectAnswer
            ? isAnswerKeySemanticallyEqual(subject.canonicalCorrectAnswer, hit.canonicalCorrectAnswer)
            : false);

        // If stem is identical but correct answer genuinely differs -> CONFLICT!
        if (!isSemanticKeyMatch) {
          context.candidates.set(hit.questionId, {
            fingerprint: hit,
            canonical: null,
            lexicalJaccard: 1.0,
            semanticCosine: null,
            rerankScore: null,
            relation: 'CONFLICT',
            decidedBy: this.id,
            llm: null,
          });

          // Answer-key conflict is a critical terminal finding
          context.final = true;
          return;
        }

        // Stem is identical and answer key is identical (distractor permutation variation or identical)
        context.candidates.set(hit.questionId, {
          fingerprint: hit,
          canonical: null,
          lexicalJaccard: 1.0,
          semanticCosine: null,
          rerankScore: null,
          relation: 'EXACT',
          decidedBy: this.id,
          llm: null,
        });
        context.final = true;
        return;
      }
    }
  }
}
