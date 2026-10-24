/**
 * Agentic tool catalogue for the AI Co-Pilot.
 *
 * Each tool is defined ONCE as a Zod schema. That schema is used to:
 *   1. validate every tool call coming back from any engine (runtime safety),
 *   2. derive the static TypeScript types below (compile-time safety),
 *   3. generate the JSON Schema advertised to cloud models (no drift).
 *
 * Tools are grouped into five suites. Which suite is available depends on the
 * `SafeAiContext` kind — see `toolPolicy.ts`.
 */
import { z } from 'zod';

const ChoiceIdSchema = z.enum(['a', 'b', 'c', 'd']).describe('Answer choice identifier');

// ============================================================================
// Suite 1 — Viewport (manipulates the question on screen)
// ============================================================================

export const HighlightColorSchema = z
  .enum(['diagnostic', 'danger', 'physiology', 'anatomy'])
  .describe('Semantic colour: diagnostic clue, red-flag finding, physiological mechanism, or anatomical landmark');
export type HighlightColor = z.infer<typeof HighlightColorSchema>;

export const HighlightStemCluesArgs = z.object({
  clues: z
    .array(
      z.object({
        phrase: z.string().min(2).max(120).describe('Exact, verbatim substring of the question stem'),
        color: HighlightColorSchema,
        meaning: z.string().min(2).max(200).describe('One-line explanation of why this phrase matters'),
      }),
    )
    .min(1)
    .max(6),
});

export const EliminateChoicesArgs = z.object({
  choiceIds: z.array(ChoiceIdSchema).min(1).max(3),
  reason: z.string().min(3).max(300).describe('Why these options can be ruled out'),
});

export const FocusChoiceArgs = z.object({
  choiceId: ChoiceIdSchema,
  label: z.string().min(1).max(40).describe('Short badge shown on the choice, e.g. "Your pick" or "Key"'),
});

// ============================================================================
// Suite 2 — Study orchestration (writes to the learner's local data)
// ============================================================================

export const RetestStrategySchema = z
  .enum(['same-concept', 'same-topic', 'weakest-topics', 'recent-mistakes'])
  .describe('How to pick questions from the verified bank');
export type RetestStrategy = z.infer<typeof RetestStrategySchema>;

export const LaunchTargetedRetestArgs = z.object({
  title: z.string().min(3).max(80),
  strategy: RetestStrategySchema,
  questionCount: z.number().int().min(1).max(25),
});

export const SaveQuestionNoteArgs = z.object({
  note: z.string().min(3).max(2000).describe('Markdown-free note to append to the learner’s personal notes'),
});

export const ToggleBookmarkArgs = z.object({
  bookmarked: z.boolean(),
});

export const RescheduleReviewArgs = z.object({
  intervalDays: z.number().min(0.5).max(60),
  reason: z.string().min(3).max(200),
});

// ============================================================================
// Suite 3 — Visual artifacts (rendered inline in the conversation)
// ============================================================================

export const RenderDifferentialTableArgs = z.object({
  title: z.string().min(3).max(100),
  rows: z
    .array(
      z.object({
        choiceId: ChoiceIdSchema.optional(),
        entity: z.string().min(1).max(100),
        isCorrect: z.boolean(),
        hallmark: z.string().min(1).max(240).describe('The single most discriminating feature'),
        verdict: z.string().min(1).max(300).describe('Why it fits or does not fit this stem'),
      }),
    )
    .min(2)
    .max(4),
  examTrap: z.string().min(3).max(300),
});

export const RenderConceptPathwayArgs = z.object({
  title: z.string().min(3).max(100),
  steps: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        detail: z.string().min(1).max(300),
      }),
    )
    .min(2)
    .max(7),
  citation: z.string().max(200).optional(),
});

export const RenderCurriculumCitationArgs = z.object({
  sourceName: z.string().min(1).max(200),
  location: z.string().min(1).max(80),
  quote: z.string().min(5).max(1200).describe('Verbatim excerpt — never paraphrase'),
  takeaway: z.string().min(3).max(300),
});

// ============================================================================
// Suite 4 — Proctor (exam navigation only, no medical content)
// ============================================================================

export const NavigateExamArgs = z.object({
  target: z.enum(['first-unanswered', 'first-flagged', 'index']),
  questionIndex: z.number().int().min(0).optional().describe('Zero-based index, required when target = "index"'),
});

// ============================================================================
// Suite 5 — Creator studio
// ============================================================================

export const AuditBankCoverageArgs = z.object({
  minQuestionsPerTopic: z.number().int().min(1).max(50),
});

// ============================================================================
// Registry
// ============================================================================

export const TOOL_ARGS = {
  highlight_stem_clues: HighlightStemCluesArgs,
  eliminate_choices: EliminateChoicesArgs,
  focus_choice: FocusChoiceArgs,
  launch_targeted_retest: LaunchTargetedRetestArgs,
  save_question_note: SaveQuestionNoteArgs,
  toggle_bookmark: ToggleBookmarkArgs,
  reschedule_review: RescheduleReviewArgs,
  render_differential_table: RenderDifferentialTableArgs,
  render_concept_pathway: RenderConceptPathwayArgs,
  render_curriculum_citation: RenderCurriculumCitationArgs,
  navigate_exam: NavigateExamArgs,
  audit_bank_coverage: AuditBankCoverageArgs,
} as const;

export type ToolName = keyof typeof TOOL_ARGS;
export type ToolArgs<N extends ToolName> = z.infer<(typeof TOOL_ARGS)[N]>;

/** A validated tool invocation. Distributes over ToolName → a true discriminated union. */
export type ToolCall = {
  readonly [N in ToolName]: { readonly id: string; readonly name: N; readonly args: ToolArgs<N> };
}[ToolName];

export type ToolSuite = 'viewport' | 'study' | 'artifact' | 'proctor' | 'studio';

export const TOOL_DESCRIPTIONS: Readonly<Record<ToolName, { readonly suite: ToolSuite; readonly description: string }>> = {
  highlight_stem_clues: { suite: 'viewport', description: 'Highlight decisive clinical clues directly inside the question stem on screen.' },
  eliminate_choices: { suite: 'viewport', description: 'Visually strike through answer choices that can be ruled out.' },
  focus_choice: { suite: 'viewport', description: 'Draw attention to one answer choice with a short badge.' },
  launch_targeted_retest: { suite: 'study', description: 'Offer a focused retest built ONLY from the verified question bank.' },
  save_question_note: { suite: 'study', description: 'Append a note or mnemonic to the learner’s notes for this question.' },
  toggle_bookmark: { suite: 'study', description: 'Bookmark or un-bookmark the current question.' },
  reschedule_review: { suite: 'study', description: 'Set the spaced-repetition interval for the current question.' },
  render_differential_table: { suite: 'artifact', description: 'Render a side-by-side differential comparison table.' },
  render_concept_pathway: { suite: 'artifact', description: 'Render an ordered mechanism / developmental pathway.' },
  render_curriculum_citation: { suite: 'artifact', description: 'Render a verbatim faculty curriculum citation card.' },
  navigate_exam: { suite: 'proctor', description: 'Jump to an unanswered, flagged, or specific question in the exam.' },
  audit_bank_coverage: { suite: 'studio', description: 'Report question-bank coverage gaps per curriculum topic.' },
};

export const isToolName = (value: string): value is ToolName => Object.hasOwn(TOOL_ARGS, value);

export type ToolParseError =
  | { readonly kind: 'unknown-tool'; readonly name: string }
  | { readonly kind: 'invalid-args'; readonly name: ToolName; readonly issues: readonly string[] };

/**
 * Validates an untrusted `{ name, args }` pair from any engine.
 * Returns a fully typed `ToolCall` or a structured error — never throws.
 */
export function parseToolCall(
  id: string,
  name: string,
  rawArgs: unknown,
): { ok: true; value: ToolCall } | { ok: false; error: ToolParseError } {
  if (!isToolName(name)) return { ok: false, error: { kind: 'unknown-tool', name } };

  const parsed = TOOL_ARGS[name].safeParse(rawArgs);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        kind: 'invalid-args',
        name,
        issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
      },
    };
  }
  // Safe: `name` and `parsed.data` originate from the same registry entry.
  return { ok: true, value: { id, name, args: parsed.data } as ToolCall };
}
