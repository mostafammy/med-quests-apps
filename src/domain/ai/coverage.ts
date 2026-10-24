/**
 * Question-bank coverage audit for the creator studio.
 * A topic's deficit is how many questions it needs to reach the threshold.
 */
import type { BankOverview } from './context.ts';
import type { CoverageRow } from './conversation.ts';

export function auditCoverage(overview: BankOverview, minQuestionsPerTopic: number): CoverageRow[] {
  return overview.topics
    .map((topic) => ({
      topicId: topic.topicId,
      topicName: topic.topicName,
      questionCount: topic.questionCount,
      highYieldCount: topic.highYieldCount,
      deficit: Math.max(0, minQuestionsPerTopic - topic.questionCount),
    }))
    .filter((row) => row.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.topicName.localeCompare(b.topicName));
}
