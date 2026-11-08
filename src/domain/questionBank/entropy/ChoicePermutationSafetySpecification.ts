import type { Question, ChoiceId } from '../../model/types.ts';
import type {
  ChoiceEntropyDomainError,
  IChoicePermutationSafetySpecification,
} from '../../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';
import { CompositeSpecification } from '../questionSpecifications.ts';

/**
 * Specification Pattern: Validates that questions do not contain hardcoded
 * option letters (e.g. "Option A", "Choice B") or positional phrases
 * ("All of the above", "None of the below") that break when permuted.
 */
export class ChoicePermutationSafetySpecification
  extends CompositeSpecification<Question>
  implements IChoicePermutationSafetySpecification
{
  private static readonly FORBIDDEN_LETTER_PATTERN =
    /\b(?:option|choice|letter)\s+[a-d]\b/i;

  private static readonly FORBIDDEN_POSITION_PATTERN =
    /\b(?:all|both|none)\s+of\s+the\s+(?:above|below)\b/i;

  public isSatisfiedBy(candidate: Question): boolean {
    return this.inspectViolations(candidate).length === 0;
  }

  public inspectViolations(question: Question): readonly ChoiceEntropyDomainError[] {
    const errors: ChoiceEntropyDomainError[] = [];

    const checkField = (
      text: string | null | undefined,
      fieldPath: 'stem' | 'explanation' | 'examTip' | 'mnemonic'
    ) => {
      if (!text) return;
      const match =
        text.match(ChoicePermutationSafetySpecification.FORBIDDEN_LETTER_PATTERN) ||
        text.match(ChoicePermutationSafetySpecification.FORBIDDEN_POSITION_PATTERN);
      if (match) {
        errors.push({
          code: 'HARDCODED_LETTER_REFERENCE_IN_TEXT',
          questionId: question.id,
          fieldPath,
          matchedToken: match[0],
          message: `Question '${question.id}' contains positional reference "${match[0]}" in ${fieldPath}.`,
        });
      }
    };

    checkField(question.stem, 'stem');
    checkField(question.explanation, 'explanation');
    checkField(question.examTip, 'examTip');
    checkField(question.mnemonic, 'mnemonic');

    for (const choice of question.choices || []) {
      if (choice.text) {
        const match =
          choice.text.match(ChoicePermutationSafetySpecification.FORBIDDEN_LETTER_PATTERN) ||
          choice.text.match(ChoicePermutationSafetySpecification.FORBIDDEN_POSITION_PATTERN);
        if (match) {
          errors.push({
            code: 'HARDCODED_LETTER_REFERENCE_IN_TEXT',
            questionId: question.id,
            fieldPath: `choices.${choice.id as ChoiceId}.rationale`,
            matchedToken: match[0],
            message: `Question '${question.id}' choice '${choice.id}' contains positional reference "${match[0]}" in text.`,
          });
        }
      }

      if (choice.rationale) {
        const match =
          choice.rationale.match(ChoicePermutationSafetySpecification.FORBIDDEN_LETTER_PATTERN) ||
          choice.rationale.match(ChoicePermutationSafetySpecification.FORBIDDEN_POSITION_PATTERN);
        if (match) {
          errors.push({
            code: 'HARDCODED_LETTER_REFERENCE_IN_TEXT',
            questionId: question.id,
            fieldPath: `choices.${choice.id as ChoiceId}.rationale`,
            matchedToken: match[0],
            message: `Question '${question.id}' choice '${choice.id}' contains positional reference "${match[0]}" in rationale.`,
          });
        }
      }
    }

    return errors;
  }
}
