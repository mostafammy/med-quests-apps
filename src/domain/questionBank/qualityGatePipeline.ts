/**
 * Domain Service: Clinical Quality Gate Pipeline & Rule Engine
 * Layer: Domain (Open/Closed Principle via IQuestionQualityRule Strategy)
 */

import { ok, err, type Result } from '../shared/result.ts';
import { QuestionSchema, type Question } from '../model/types.ts';
import type {
  IQuestionQualityRule,
  QuestionBankDomainError,
  StemSha256Hash,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionCanonicalHasher } from './canonicalHasher.ts';

/**
 * Rule 1: Structural Schema Validation (Zod)
 */
export class ZodStructureQualityRule implements IQuestionQualityRule {
  public readonly ruleId = 'ZOD_SCHEMA_VALIDATION';
  public readonly description = 'Validates all required fields, choice lengths, and cognitive taxonomies against QuestionSchema';

  public validate(question: Question, index: number): Result<void, QuestionBankDomainError> {
    const parse = QuestionSchema.safeParse(question);
    if (!parse.success) {
      const firstIssue = parse.error.issues[0];
      return err({
        code: 'SCHEMA_VALIDATION_FAILED',
        itemIndex: index,
        fieldPath: firstIssue ? firstIssue.path.join('.') : 'root',
        message: firstIssue ? firstIssue.message : 'Invalid question structure',
      });
    }
    return ok(undefined);
  }
}

/**
 * Rule 2: Single Best Answer (SBA) Invariant Rule
 */
export class SingleCorrectChoiceRule implements IQuestionQualityRule {
  public readonly ruleId = 'SINGLE_CORRECT_CHOICE_INVARIANT';
  public readonly description = 'Enforces exactly 1 correct choice and exactly 3 plausible distractors with rationales';

  public validate(question: Question, index: number): Result<void, QuestionBankDomainError> {
    const choices = question.choices || [];
    const correctCount = choices.filter((c) => c.isCorrect).length;

    if (correctCount !== 1) {
      return err({
        code: 'SCHEMA_VALIDATION_FAILED',
        itemIndex: index,
        fieldPath: 'choices',
        message: `Single-best-answer questions must have exactly 1 correct choice (found ${correctCount}).`,
      });
    }

    const missingRationale = choices.find((c) => !c.rationale || c.rationale.trim().length < 5);
    if (missingRationale) {
      return err({
        code: 'SCHEMA_VALIDATION_FAILED',
        itemIndex: index,
        fieldPath: `choices.${missingRationale.id}.rationale`,
        message: `Choice '${missingRationale.id.toUpperCase()}' is missing a detailed clinical rationale (minimum 5 characters).`,
      });
    }

    return ok(undefined);
  }
}

/**
 * Rule 3: Clinical Evidence & Curriculum Grounding Rule
 */
export class ClinicalEvidenceGroundingRule implements IQuestionQualityRule {
  public readonly ruleId = 'CLINICAL_EVIDENCE_GROUNDING';
  public readonly description = 'Ensures at least 1 verbatim excerpt citing authoritative lecture slides or syllabus text';

  public validate(question: Question, _index: number): Result<void, QuestionBankDomainError> {
    const evidenceList = question.evidence || [];
    if (evidenceList.length === 0) {
      return err({
        code: 'INSUFFICIENT_EVIDENCE_GROUNDING',
        questionId: question.id,
        reason: 'Every question must cite at least 1 curriculum evidence source.',
      });
    }

    for (const ev of evidenceList) {
      if (!ev.quote || ev.quote.trim().length < 10) {
        return err({
          code: 'INSUFFICIENT_EVIDENCE_GROUNDING',
          questionId: question.id,
          reason: `Evidence excerpt for "${ev.sourceName}" is too short (${ev.quote?.length || 0} chars). Must be a verbatim quote of >= 10 chars.`,
        });
      }
      if (!ev.location || ev.location.trim().length === 0) {
        return err({
          code: 'INSUFFICIENT_EVIDENCE_GROUNDING',
          questionId: question.id,
          reason: `Evidence citation for "${ev.sourceName}" must specify a slide, page, or paragraph location.`,
        });
      }
    }

    return ok(undefined);
  }
}

export interface BatchQualityGateResult {
  readonly validQuestions: readonly Question[];
  readonly errors: readonly QuestionBankDomainError[];
  readonly stemHashes: ReadonlyMap<string, StemSha256Hash>;
}

/**
 * Quality Gate Pipeline: Composes multiple validation rules (Open/Closed Principle).
 */
export class QuestionQualityGatePipeline {
  private readonly rules: readonly IQuestionQualityRule[];

  public constructor(customRules?: readonly IQuestionQualityRule[]) {
    this.rules = customRules ?? [
      new ZodStructureQualityRule(),
      new SingleCorrectChoiceRule(),
      new ClinicalEvidenceGroundingRule(),
    ];
  }

  /**
   * Validates a batch of questions, checks for intra-batch duplicate stems,
   * and computes stem fingerprints for each valid item.
   */
  public validateBatch(rawQuestions: readonly Question[]): BatchQualityGateResult {
    const validQuestions: Question[] = [];
    const errors: QuestionBankDomainError[] = [];
    const stemHashes = new Map<string, StemSha256Hash>();
    const seenHashesInBatch = new Map<StemSha256Hash, string>();

    rawQuestions.forEach((q, index) => {
      let isItemValid = true;

      for (const rule of this.rules) {
        const result = rule.validate(q, index);
        if (!result.ok) {
          errors.push(result.error);
          isItemValid = false;
          break; // Stop at first failure for this item
        }
      }

      if (isItemValid) {
        const hash = QuestionCanonicalHasher.computeStemHashSync(q.stem);
        const existingId = seenHashesInBatch.get(hash);

        if (existingId) {
          errors.push({
            code: 'DUPLICATE_STEM_CONFLICT',
            existingQuestionId: existingId,
            stemHash: hash,
            chapterId: q.chapterId,
            message: `Question '${q.id}' has a duplicate stem identical to '${existingId}' in the same batch.`,
          });
        } else {
          seenHashesInBatch.set(hash, q.id);
          stemHashes.set(q.id, hash);
          validQuestions.push(q);
        }
      }
    });

    return {
      validQuestions,
      errors,
      stemHashes,
    };
  }
}
