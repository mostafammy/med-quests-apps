/**
 * Tool authorization & ground-truth sanitization.
 *
 * Every tool call — from the offline tutor or a cloud model — passes through
 * `authorizeToolCall()` before it can touch the UI or storage. Two layers:
 *
 * 1. **Access matrix**: which tools a given `SafeAiContext` may use
 *    (e.g. proctor mode can navigate the exam but never highlight clues).
 *
 * 2. **Ground-truth verification** (Constitution P2): the trusted `Question`
 *    — which the model may never have seen — is used to repair or reject calls:
 *      • highlights must be verbatim substrings of the stem,
 *      • the correct answer can never be struck through,
 *      • citations must quote the question's real curriculum evidence.
 *
 * Rejections deliberately carry generic reasons so a refusal never leaks the key.
 */
import type { ChoiceId, Question } from '../model/types.ts';
import type { SafeAiContext } from './context.ts';
import type { ToolCall, ToolName } from './tools.ts';
import { correctChoiceOf } from './policyGate.ts';
import { assertNever, err, ok, type Result } from '../shared/result.ts';

/** Trusted state that is NEVER serialized to an engine. */
export interface GroundTruth {
  readonly question: Question | null;
}

export interface PolicyViolation {
  readonly tool: ToolName;
  readonly reason: string;
}

type AccessRule = (context: SafeAiContext) => boolean;

const isTutor: AccessRule = (c) => c.kind === 'tutor';
const isRevealedTutor: AccessRule = (c) => c.kind === 'tutor' && c.disclosure.state === 'revealed';

const ACCESS_MATRIX: Readonly<Record<ToolName, AccessRule>> = {
  highlight_stem_clues: isTutor,
  eliminate_choices: isTutor,
  focus_choice: isRevealedTutor,
  launch_targeted_retest: (c) => c.kind === 'tutor' || c.kind === 'workspace',
  save_question_note: isTutor,
  toggle_bookmark: (c) => c.kind === 'tutor' || c.kind === 'proctor',
  reschedule_review: isRevealedTutor,
  render_differential_table: isRevealedTutor,
  render_concept_pathway: isRevealedTutor,
  render_curriculum_citation: isRevealedTutor,
  navigate_exam: (c) => c.kind === 'proctor',
  audit_bank_coverage: (c) => c.kind === 'studio',
};

export const isToolAllowed = (tool: ToolName, context: SafeAiContext): boolean => ACCESS_MATRIX[tool](context);

export const allowedTools = (context: SafeAiContext): readonly ToolName[] =>
  (Object.keys(ACCESS_MATRIX) as ToolName[]).filter((tool) => ACCESS_MATRIX[tool](context));

/** Minimum options left on screen when eliminating before the learner answers. */
const MIN_REMAINING_CHOICES_WHILE_SEALED = 2;

export function authorizeToolCall(
  call: ToolCall,
  context: SafeAiContext,
  truth: GroundTruth,
): Result<ToolCall, PolicyViolation> {
  const deny = (reason: string) => err<PolicyViolation>({ tool: call.name, reason });

  if (!isToolAllowed(call.name, context)) return deny('This action is not available in the current mode.');

  switch (call.name) {
    case 'highlight_stem_clues': {
      const stem = truth.question?.stem ?? '';
      const clues = call.args.clues
        .map((clue) => ({ ...clue, phrase: findVerbatim(stem, clue.phrase) }))
        .filter((clue): clue is typeof clue & { phrase: string } => clue.phrase !== null);
      return clues.length > 0 ? ok({ ...call, args: { clues } }) : deny('No highlighted phrase matched the question text.');
    }

    case 'eliminate_choices': {
      if (!truth.question) return deny('No active question.');
      const correct = correctChoiceOf(truth.question);
      const sealed = context.kind === 'tutor' && context.disclosure.state === 'sealed';
      const maxEliminations = sealed ? truth.question.choices.length - MIN_REMAINING_CHOICES_WHILE_SEALED : 3;

      const choiceIds = unique(call.args.choiceIds)
        .filter((id) => id !== correct)
        .slice(0, maxEliminations);
      return choiceIds.length > 0 ? ok({ ...call, args: { ...call.args, choiceIds } }) : deny('No options could be ruled out.');
    }

    case 'render_curriculum_citation': {
      const evidence = truth.question?.evidence.find((item) => normalize(item.quote).includes(normalize(call.args.quote)));
      if (!evidence) return deny('Citation does not match the verified curriculum evidence for this question.');
      // Re-anchor source metadata to ground truth so a model can never mislabel a source.
      return ok({ ...call, args: { ...call.args, sourceName: evidence.sourceName, location: evidence.location } });
    }

    case 'navigate_exam': {
      if (context.kind !== 'proctor') return deny('Navigation is only available during an exam.');
      if (call.args.target !== 'index') return ok(call);
      const index = call.args.questionIndex;
      return index !== undefined && index < context.totalQuestions ? ok(call) : deny('Question number is out of range.');
    }

    case 'focus_choice':
    case 'launch_targeted_retest':
    case 'save_question_note':
    case 'toggle_bookmark':
    case 'reschedule_review':
    case 'render_differential_table':
    case 'render_concept_pathway':
    case 'audit_bank_coverage':
      return ok(call);

    default:
      return assertNever(call, 'Unhandled tool in authorizeToolCall');
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const normalize = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

const unique = (ids: readonly ChoiceId[]): ChoiceId[] => [...new Set(ids)];

/** Returns the stem's own casing of `phrase` if it occurs verbatim (case-insensitive), else null. */
export function findVerbatim(haystack: string, phrase: string): string | null {
  const needle = phrase.trim();
  if (needle.length === 0) return null;
  const index = haystack.toLowerCase().indexOf(needle.toLowerCase());
  return index === -1 ? null : haystack.slice(index, index + needle.length);
}
