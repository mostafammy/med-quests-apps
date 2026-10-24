/**
 * Quick intents — one-keystroke prompts (Alt+1…Alt+6) tailored to each context.
 *
 * Intents are the vocabulary shared by the UI, the offline tutor, and the cloud
 * prompt builder: the UI shows them, the offline tutor executes them, and cloud
 * engines receive the intent's prompt text.
 */
import type { SafeAiContext } from './context.ts';
import { assertNever } from '../shared/result.ts';

export type QuickIntentId =
  | 'explain'
  | 'clues'
  | 'compare'
  | 'cite'
  | 'remember'
  | 'retest'
  | 'pacing'
  | 'jump-flagged'
  | 'jump-unanswered'
  | 'weakest-drill'
  | 'study-plan'
  | 'coverage-audit';

export interface QuickIntent {
  readonly id: QuickIntentId;
  readonly label: string;
  /** Rendered verbatim as the learner's message. */
  readonly prompt: string;
}

const INTENTS: Readonly<Record<QuickIntentId, QuickIntent>> = {
  explain: { id: 'explain', label: 'Explain', prompt: 'Why is my answer right or wrong, and why is the key correct?' },
  clues: { id: 'clues', label: 'Clues', prompt: 'Highlight the decisive clues in the stem and rule out what doesn’t fit.' },
  compare: { id: 'compare', label: 'Compare', prompt: 'Compare my choice with the correct answer side by side.' },
  cite: { id: 'cite', label: 'Lecture source', prompt: 'Show me exactly where this is in my faculty lecture.' },
  remember: { id: 'remember', label: 'Memory hook', prompt: 'Give me a memory hook for this and save it to my notes.' },
  retest: { id: 'retest', label: 'Retest me', prompt: 'Retest me on this concept with questions from the bank.' },
  pacing: { id: 'pacing', label: 'Pacing check', prompt: 'How is my pacing? How much time per remaining question?' },
  'jump-flagged': { id: 'jump-flagged', label: 'First flagged', prompt: 'Take me to my first flagged question.' },
  'jump-unanswered': { id: 'jump-unanswered', label: 'First unanswered', prompt: 'Take me to my first unanswered question.' },
  'weakest-drill': { id: 'weakest-drill', label: 'Weakest drill', prompt: 'Build a 10-question drill on my weakest topics.' },
  'study-plan': { id: 'study-plan', label: 'What next?', prompt: 'What should I study next, based on my performance?' },
  'coverage-audit': { id: 'coverage-audit', label: 'Coverage audit', prompt: 'Audit the question bank for topics with thin coverage.' },
};

/** Ordered intents for a context. Index i is bound to Alt+(i+1). */
export function quickIntentsFor(context: SafeAiContext): readonly QuickIntent[] {
  const pick = (...ids: QuickIntentId[]): QuickIntent[] => ids.map((id) => INTENTS[id]);

  switch (context.kind) {
    case 'proctor':
      return pick('pacing', 'jump-flagged', 'jump-unanswered');
    case 'tutor':
      return context.disclosure.state === 'sealed'
        ? pick('clues', 'retest')
        : pick('explain', 'clues', 'compare', 'cite', 'remember', 'retest');
    case 'workspace':
      return pick('study-plan', 'weakest-drill');
    case 'studio':
      return pick('coverage-audit');
    default:
      return assertNever(context, 'Unknown context in quickIntentsFor');
  }
}

export const getQuickIntent = (id: QuickIntentId): QuickIntent => INTENTS[id];

/**
 * Maps free text to the closest intent for the offline tutor.
 * Ordered rules: the first matching pattern wins.
 */
const INTENT_PATTERNS: readonly (readonly [QuickIntentId, RegExp])[] = [
  ['jump-flagged', /\bflag(ged)?\b/i],
  ['jump-unanswered', /\b(unanswered|skipped|blank)\b/i],
  ['pacing', /\b(time|pacing|pace|minutes?|clock)\b/i],
  ['coverage-audit', /\b(coverage|audit|gaps?)\b/i],
  ['weakest-drill', /\bweak(est)?\b/i],
  ['retest', /\b(retest|drill|quiz|practi[cs]e|more questions)\b/i],
  ['compare', /\b(compare|versus|vs|difference|differentiate)\b/i],
  ['cite', /\b(source|slide|lecture|page|reference|cite|where)\b/i],
  ['remember', /\b(mnemonic|remember|memori[sz]e|hook|note)\b/i],
  ['clues', /\b(clues?|hint|highlight|eliminate|rule out|stuck)\b/i],
  ['study-plan', /\b(next|plan|focus|should i)\b/i],
  ['explain', /\b(why|explain|wrong|right|correct|understand)\b/i],
];

export function classifyIntent(text: string, context: SafeAiContext): QuickIntentId {
  const available = new Set(quickIntentsFor(context).map((intent) => intent.id));
  const match = INTENT_PATTERNS.find(([id, pattern]) => available.has(id) && pattern.test(text));
  const fallback = quickIntentsFor(context)[0];
  return match?.[0] ?? fallback?.id ?? 'explain';
}
