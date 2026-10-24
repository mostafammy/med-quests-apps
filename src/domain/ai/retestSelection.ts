/**
 * Retest selection (BRD §9.7, Constitution P3).
 *
 * Builds a retest exclusively from the verified, versioned question bank —
 * the AI can ask for a retest, but it can never invent a question.
 *
 * Selection widens in tiers until `count` is reached:
 *   same-concept → anchor · same concept · same topic · same chapter
 *   same-topic   → anchor · same topic · same chapter
 *   weakest      → topics by ascending accuracy (mistakes first within a topic)
 *   mistakes     → every question whose latest attempt was wrong
 *
 * Deterministic: ties keep bank order, so the same inputs give the same session.
 */
import type { Question, QuestionId, Ratio, TopicId } from '../model/types.ts';
import type { RetestStrategy } from './tools.ts';
import { assertNever, err, ok, type Result } from '../shared/result.ts';

export interface RetestInput {
  readonly strategy: RetestStrategy;
  readonly count: number;
  readonly anchor: Question | null;
  readonly bank: readonly Question[];
  readonly mistakeIds: ReadonlySet<QuestionId>;
  readonly topicPerformance: ReadonlyMap<TopicId, { readonly accuracy: Ratio; readonly attempts: number }>;
}

export type RetestError = { readonly reason: string };

export function selectRetestQuestions(input: RetestInput): Result<readonly Question[], RetestError> {
  const pool = input.bank.filter((q) => q.status !== 'quarantined');
  const { anchor } = input;

  const tiers = ((): readonly (readonly Question[])[] => {
    switch (input.strategy) {
      case 'same-concept':
        if (!anchor) return [];
        return [[anchor], ...[sameConcept, sameTopic, sameChapter].map((match) => pool.filter((q) => match(q, anchor)))];
      case 'same-topic':
        if (!anchor) return [];
        return [[anchor], ...[sameTopic, sameChapter].map((match) => pool.filter((q) => match(q, anchor)))];
      case 'weakest-topics':
        return weakestTopicOrder(input.topicPerformance).map((topicId) => pool.filter((q) => q.topicId === topicId));
      case 'recent-mistakes':
        return [pool.filter((q) => input.mistakeIds.has(q.id))];
      default:
        return assertNever(input.strategy, 'Unknown retest strategy');
    }
  })();

  const selected = new Map<QuestionId, Question>();
  for (const tier of tiers) {
    for (const question of prioritiseMistakes(tier, input.mistakeIds)) {
      if (selected.size >= input.count) break;
      selected.set(question.id, question);
    }
  }

  if (selected.size === 0) return err({ reason: emptyReason(input.strategy, anchor !== null) });
  return ok([...selected.values()]);
}

const sameConcept = (q: Question, a: Question) => q.concept === a.concept;
const sameTopic = (q: Question, a: Question) => q.topicId === a.topicId;
const sameChapter = (q: Question, a: Question) => q.chapterId === a.chapterId;

/** Stable partition: unresolved mistakes first, bank order preserved inside each half. */
const prioritiseMistakes = (questions: readonly Question[], mistakes: ReadonlySet<QuestionId>): Question[] => [
  ...questions.filter((q) => mistakes.has(q.id)),
  ...questions.filter((q) => !mistakes.has(q.id)),
];

function weakestTopicOrder(performance: RetestInput['topicPerformance']): TopicId[] {
  return [...performance.entries()]
    .filter(([, stats]) => stats.attempts > 0)
    .sort(([, a], [, b]) => a.accuracy - b.accuracy)
    .map(([topicId]) => topicId);
}

function emptyReason(strategy: RetestStrategy, hasAnchor: boolean): string {
  switch (strategy) {
    case 'same-concept':
    case 'same-topic':
      return hasAnchor ? 'No related questions are in the bank yet.' : 'Open a question first so I know what to retest.';
    case 'weakest-topics':
      return 'Answer a few questions first — I need data to find your weakest topics.';
    case 'recent-mistakes':
      return 'You have no unresolved mistakes. Nice work!';
    default:
      return assertNever(strategy);
  }
}
