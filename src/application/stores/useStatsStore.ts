import { create } from 'zustand';
import { db } from '../../infrastructure/storage/db.ts';
import { Question, Attempt } from '../../domain/model/types.ts';
import { CVS_TAXONOMY } from '../../domain/taxonomy/cvsTaxonomy.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';

export interface TopicStat {
  topicId: string;
  topicName: string;
  chapterId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  status: 'critical' | 'weak' | 'developing' | 'mastered' | 'unattempted';
}

export interface StatsState {
  totalAttempts: number;
  totalAnsweredQuestions: number;
  overallAccuracy: number;
  masteryPercentage: number;
  weakTopicsCount: number;
  dueReviewsCount: number;
  topicStats: TopicStat[];
  mistakeQuestionIds: string[];
  isLoading: boolean;

  // Actions
  refreshStats: (questions: Question[]) => Promise<void>;
  resetStats: (questions?: Question[]) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  totalAttempts: 0,
  totalAnsweredQuestions: 0,
  overallAccuracy: 0,
  masteryPercentage: 0,
  weakTopicsCount: 0,
  dueReviewsCount: 0,
  topicStats: [],
  mistakeQuestionIds: [],
  isLoading: false,

  refreshStats: async (questions: Question[]) => {
    set({ isLoading: true });
    try {
      const attempts = await db.attempts.toArray();
      const reviewCards = await db.reviewCards.toArray();

      if (attempts.length === 0) {
        // Zero state
        const initialTopicStats: TopicStat[] = CVS_TAXONOMY.topics.map((t) => ({
          topicId: t.id,
          topicName: t.name,
          chapterId: t.chapterId,
          totalAttempts: 0,
          correctAttempts: 0,
          accuracy: 0,
          status: 'unattempted',
        }));

        set({
          totalAttempts: 0,
          totalAnsweredQuestions: 0,
          overallAccuracy: 0,
          masteryPercentage: 0,
          weakTopicsCount: 0,
          dueReviewsCount: reviewCards.length,
          topicStats: initialTopicStats,
          mistakeQuestionIds: [],
          isLoading: false,
        });
        return;
      }

      // Compute question-level history
      const attemptsByQuestion = new Map<string, Attempt[]>();
      attempts.forEach((att) => {
        const list = attemptsByQuestion.get(att.questionId) || [];
        list.push(att);
        attemptsByQuestion.set(att.questionId, list);
      });

      const uniqueQuestionsAnswered = attemptsByQuestion.size;
      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter((a) => a.isCorrect === true).length;
      const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // Identify mistake questions (most recent attempt was incorrect)
      const mistakeQuestionIds: string[] = [];
      attemptsByQuestion.forEach((qAttempts, qId) => {
        // Sort descending by answeredAt
        const sorted = [...qAttempts].sort((a, b) => 
          new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
        );
        if (sorted[0] && sorted[0].isCorrect === false) {
          mistakeQuestionIds.push(qId);
        }
      });

      // Map question to topic
      const questionTopicMap = new Map<string, string>();
      questions.forEach((q) => {
        questionTopicMap.set(q.id, q.topicId);
      });

      // Group attempts by topic
      const topicStatsMap = new Map<string, { total: number; correct: number }>();
      attempts.forEach((att) => {
        const topicId = questionTopicMap.get(att.questionId) || 'unknown';
        const curr = topicStatsMap.get(topicId) || { total: 0, correct: 0 };
        curr.total += 1;
        if (att.isCorrect) curr.correct += 1;
        topicStatsMap.set(topicId, curr);
      });

      let weakTopicsCount = 0;
      const topicStats: TopicStat[] = CVS_TAXONOMY.topics.map((t) => {
        const stat = topicStatsMap.get(t.id);
        if (!stat || stat.total === 0) {
          return {
            topicId: t.id,
            topicName: t.name,
            chapterId: t.chapterId,
            totalAttempts: 0,
            correctAttempts: 0,
            accuracy: 0,
            status: 'unattempted',
          };
        }

        const acc = Math.round((stat.correct / stat.total) * 100);
        let status: TopicStat['status'] = 'mastered';
        if (acc < 60) {
          status = 'critical';
          weakTopicsCount += 1;
        } else if (acc < 70) {
          status = 'weak';
          weakTopicsCount += 1;
        } else if (acc < 85) {
          status = 'developing';
        }

        return {
          topicId: t.id,
          topicName: t.name,
          chapterId: t.chapterId,
          totalAttempts: stat.total,
          correctAttempts: stat.correct,
          accuracy: acc,
          status,
        };
      });

      // Mastery: proportion of question bank correctly answered at least once
      const masteredQuestions = Array.from(attemptsByQuestion.values()).filter((qAtts) =>
        qAtts.some((a) => a.isCorrect === true)
      ).length;

      const totalQuestionsCount = questions.length > 0 ? questions.length : defaultCvsBank.length;
      const masteryPercentage = Math.round((masteredQuestions / totalQuestionsCount) * 100);

      set({
        totalAttempts,
        totalAnsweredQuestions: uniqueQuestionsAnswered,
        overallAccuracy,
        masteryPercentage,
        weakTopicsCount,
        dueReviewsCount: reviewCards.length,
        topicStats,
        mistakeQuestionIds,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  resetStats: async (questions = []) => {
    set({ isLoading: true });
    try {
      // Clear all attempts and review card SRS data in IndexedDB
      await db.attempts.clear();
      await db.reviewCards.clear();

      // Refresh to zero
      await get().refreshStats(questions);
    } finally {
      set({ isLoading: false });
    }
  },
}));
