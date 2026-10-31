import { create } from 'zustand';
import { db } from '../../infrastructure/storage/db.ts';
import { Question, Attempt } from '../../domain/model/types.ts';
import { CVS_TAXONOMY } from '../../domain/taxonomy/cvsTaxonomy.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';

export const LOCAL_TELEMETRY_STORAGE_KEY = 'medquests_local_study_telemetry_v1';

export interface TopicStat {
  topicId: string;
  topicName: string;
  chapterId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  status: 'critical' | 'weak' | 'developing' | 'mastered' | 'unattempted';
}

export interface SubjectReadinessStat {
  subjectId: string;
  subjectName: string;
  chaptersCount: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  coveragePercent: number;
  masteryPercent: number;
}

export interface PacingQuadrantMetrics {
  fastAccurate: number; // <= 45s & correct (Automatic Mastery)
  slowAccurate: number; // > 45s & correct (Effortful Reasoning)
  fastWrong: number;    // <= 45s & wrong (Premature Closure / Rush Trap)
  slowWrong: number;    // > 45s & wrong (Core Knowledge Gap)
}

export interface InstinctMetrics {
  totalChanges: number;
  changedToCorrect: number;
  changedToWrong: number;
}

export interface ConfidenceCalibrationMetrics {
  sureCorrect: number;
  sureWrong: number;    // Clinical Overconfidence Alert
  guessCorrect: number; // Lucky Guess
  guessWrong: number;
  unsureCorrect: number;
  unsureWrong: number;
}

export interface RetentionForecastMetrics {
  dueNow: number;
  dueTomorrow: number;
  dueIn3Days: number;
  dueIn7Days: number;
  stabilizedCards: number;
  totalTrackedCards: number;
}

export interface ScopeCoverageSummary {
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  percentComplete: number;
  unansweredIds: string[];
  answeredIds: string[];
  incorrectIds: string[];
  correctIds: string[];
}

export interface StatsState {
  totalAttempts: number;
  totalAnsweredQuestions: number;
  overallAccuracy: number;
  masteryPercentage: number;
  weakTopicsCount: number;
  dueReviewsCount: number;
  topicStats: TopicStat[];
  subjectReadiness: Record<string, SubjectReadinessStat>;
  mistakeQuestionIds: string[];
  answeredQuestionIds: string[];
  correctQuestionIds: string[];
  avgPaceSeconds: number;
  streakDays: number;
  todayAttempts: number;
  dailyGoalTarget: number;
  pacingQuadrants: PacingQuadrantMetrics;
  instinctStats: InstinctMetrics;
  confidenceCalibration: ConfidenceCalibrationMetrics;
  retentionForecast: RetentionForecastMetrics;
  favoriteSubspecialty: string;
  isLoading: boolean;

  // Actions
  refreshStats: (questions: Question[]) => Promise<void>;
  resetStats: (questions?: Question[]) => Promise<void>;
  resetSubjectStats: (subjectId: string, questions?: Question[]) => Promise<void>;
  getScopeCoverage: (
    questions: Question[],
    filter?: {
      subjectId?: string;
      chapterId?: string;
      highYieldOnly?: boolean;
    }
  ) => ScopeCoverageSummary;
}

function buildDefaultSubjectReadiness(questions: Question[]): Record<string, SubjectReadinessStat> {
  const activeBank = questions.length > 0 ? questions : (defaultCvsBank as Question[]);
  const result: Record<string, SubjectReadinessStat> = {};

  for (const subj of CVS_TAXONOMY.subjects) {
    const subjQuestions = activeBank.filter((q) => q.subjectId === subj.id);
    const chaptersCount = CVS_TAXONOMY.chapters.filter((c) => c.subjectId === subj.id).length;
    result[subj.id] = {
      subjectId: subj.id,
      subjectName: subj.name,
      chaptersCount,
      totalQuestions: subjQuestions.length,
      answeredCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: subjQuestions.length,
      accuracy: 0,
      coveragePercent: 0,
      masteryPercent: 0,
    };
  }
  return result;
}

function computeStreakAndTodayAttempts(attempts: Attempt[]): {
  streakDays: number;
  todayAttempts: number;
} {
  if (attempts.length === 0) {
    return { streakDays: 0, todayAttempts: 0 };
  }

  const now = new Date();
  const toDayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = toDayKey(now);

  const daySet = new Set<string>();
  let todayAttempts = 0;

  for (const att of attempts) {
    const dt = new Date(att.answeredAt);
    if (!Number.isNaN(dt.getTime())) {
      const k = toDayKey(dt);
      daySet.add(k);
      if (k === todayKey) {
        todayAttempts += 1;
      }
    }
  }

  let streakDays = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!daySet.has(toDayKey(cursor))) {
    // Check if yesterday had activity to keep streak alive before today's first question
    cursor.setDate(cursor.getDate() - 1);
  }

  while (daySet.has(toDayKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { streakDays, todayAttempts };
}

export const useStatsStore = create<StatsState>((set, get) => ({
  totalAttempts: 0,
  totalAnsweredQuestions: 0,
  overallAccuracy: 0,
  masteryPercentage: 0,
  weakTopicsCount: 0,
  dueReviewsCount: 0,
  topicStats: [],
  subjectReadiness: buildDefaultSubjectReadiness([]),
  mistakeQuestionIds: [],
  answeredQuestionIds: [],
  correctQuestionIds: [],
  avgPaceSeconds: 0,
  streakDays: 0,
  todayAttempts: 0,
  dailyGoalTarget: 20,
  pacingQuadrants: {
    fastAccurate: 0,
    slowAccurate: 0,
    fastWrong: 0,
    slowWrong: 0,
  },
  instinctStats: {
    totalChanges: 0,
    changedToCorrect: 0,
    changedToWrong: 0,
  },
  confidenceCalibration: {
    sureCorrect: 0,
    sureWrong: 0,
    guessCorrect: 0,
    guessWrong: 0,
    unsureCorrect: 0,
    unsureWrong: 0,
  },
  retentionForecast: {
    dueNow: 0,
    dueTomorrow: 0,
    dueIn3Days: 0,
    dueIn7Days: 0,
    stabilizedCards: 0,
    totalTrackedCards: 0,
  },
  favoriteSubspecialty: 'Anatomy & Pericardium',
  isLoading: false,

  refreshStats: async (questions: Question[]) => {
    set({ isLoading: true });
    try {
      const activeBank = questions.length > 0 ? questions : (defaultCvsBank as Question[]);
      const [attempts, reviewCards, srsCards, aiMetrics] = await Promise.all([
        db.attempts.toArray(),
        db.reviewCards.toArray(),
        db.srsCards.toArray().catch(() => []),
        db.aiModelMetrics.toArray().catch(() => []),
      ]);

      const nowMs = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Compute accurate SM-2 Retention Forecast & Due Reviews Count (Strictly dueAt <= now)
      let dueNow = 0;
      let dueTomorrow = 0;
      let dueIn3Days = 0;
      let dueIn7Days = 0;
      let stabilizedCards = 0;

      for (const card of reviewCards) {
        const dueMs = new Date(card.dueAt).getTime();
        const diffMs = dueMs - nowMs;
        if (Number.isNaN(dueMs) || diffMs <= 0) {
          dueNow += 1;
        } else if (diffMs <= dayMs) {
          dueTomorrow += 1;
        } else if (diffMs <= 3 * dayMs) {
          dueIn3Days += 1;
        } else if (diffMs <= 7 * dayMs) {
          dueIn7Days += 1;
        } else {
          stabilizedCards += 1;
        }
      }

      for (const srs of srsCards) {
        const dueMs = new Date(srs.nextReviewAt).getTime();
        const diffMs = dueMs - nowMs;
        if (!Number.isNaN(dueMs) && diffMs <= 0) {
          dueNow += 1;
        }
      }

      const retentionForecast: RetentionForecastMetrics = {
        dueNow,
        dueTomorrow,
        dueIn3Days,
        dueIn7Days,
        stabilizedCards,
        totalTrackedCards: reviewCards.length + srsCards.length,
      };

      if (attempts.length === 0) {
        const initialTopicStats: TopicStat[] = CVS_TAXONOMY.topics.map((t) => ({
          topicId: t.id,
          topicName: t.name,
          chapterId: t.chapterId,
          totalAttempts: 0,
          correctAttempts: 0,
          accuracy: 0,
          status: 'unattempted',
        }));

        const zeroSubjectReadiness = buildDefaultSubjectReadiness(activeBank);

        set({
          totalAttempts: 0,
          totalAnsweredQuestions: 0,
          overallAccuracy: 0,
          masteryPercentage: 0,
          weakTopicsCount: 0,
          dueReviewsCount: dueNow,
          topicStats: initialTopicStats,
          subjectReadiness: zeroSubjectReadiness,
          mistakeQuestionIds: [],
          answeredQuestionIds: [],
          correctQuestionIds: [],
          avgPaceSeconds: 0,
          streakDays: 0,
          todayAttempts: 0,
          pacingQuadrants: { fastAccurate: 0, slowAccurate: 0, fastWrong: 0, slowWrong: 0 },
          instinctStats: { totalChanges: 0, changedToCorrect: 0, changedToWrong: 0 },
          confidenceCalibration: {
            sureCorrect: 0,
            sureWrong: 0,
            guessCorrect: 0,
            guessWrong: 0,
            unsureCorrect: 0,
            unsureWrong: 0,
          },
          retentionForecast,
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
      const overallAccuracy =
        totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // Identify question statuses (most recent attempt)
      const answeredQuestionIds: string[] = [];
      const correctQuestionIds: string[] = [];
      const mistakeQuestionIds: string[] = [];
      attemptsByQuestion.forEach((qAttempts, qId) => {
        answeredQuestionIds.push(qId);
        const sorted = [...qAttempts].sort(
          (a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
        );
        if (sorted[0]) {
          if (sorted[0].isCorrect === true) {
            correctQuestionIds.push(qId);
          } else if (sorted[0].isCorrect === false) {
            mistakeQuestionIds.push(qId);
          }
        }
      });

      // Map question to topic & subject
      const questionTopicMap = new Map<string, string>();
      const questionChapterMap = new Map<string, string>();
      activeBank.forEach((q) => {
        questionTopicMap.set(q.id, q.topicId);
        questionChapterMap.set(q.id, q.chapterId);
      });

      // Group attempts by topic & chapter
      const topicStatsMap = new Map<string, { total: number; correct: number }>();
      const chapterCountsMap = new Map<string, number>();

      // Cognitive Pacing, Hesitation & Confidence Aggregation
      let totalValidTimeMs = 0;
      let validTimeCount = 0;
      const pacingQuadrants: PacingQuadrantMetrics = {
        fastAccurate: 0,
        slowAccurate: 0,
        fastWrong: 0,
        slowWrong: 0,
      };
      const instinctStats: InstinctMetrics = {
        totalChanges: 0,
        changedToCorrect: 0,
        changedToWrong: 0,
      };
      const confidenceCalibration: ConfidenceCalibrationMetrics = {
        sureCorrect: 0,
        sureWrong: 0,
        guessCorrect: 0,
        guessWrong: 0,
        unsureCorrect: 0,
        unsureWrong: 0,
      };

      const PACE_THRESHOLD_MS = 45000; // 45s per clinical vignette

      for (const att of attempts) {
        const topicId = questionTopicMap.get(att.questionId) || 'unknown';
        const curr = topicStatsMap.get(topicId) || { total: 0, correct: 0 };
        curr.total += 1;
        if (att.isCorrect) curr.correct += 1;
        topicStatsMap.set(topicId, curr);

        const chapId = questionChapterMap.get(att.questionId);
        if (chapId) {
          chapterCountsMap.set(chapId, (chapterCountsMap.get(chapId) || 0) + 1);
        }

        const timeMs = att.responseTimeMs > 0 ? att.responseTimeMs : 22000;
        totalValidTimeMs += timeMs;
        validTimeCount += 1;

        const isFast = timeMs <= PACE_THRESHOLD_MS;
        if (att.isCorrect === true) {
          if (isFast) pacingQuadrants.fastAccurate += 1;
          else pacingQuadrants.slowAccurate += 1;
        } else if (att.isCorrect === false) {
          if (isFast) pacingQuadrants.fastWrong += 1;
          else pacingQuadrants.slowWrong += 1;
        }

        const changes = att.choiceChangesCount ?? 0;
        if (changes > 0) {
          instinctStats.totalChanges += 1;
          if (att.isCorrect === true) instinctStats.changedToCorrect += 1;
          else if (att.isCorrect === false) instinctStats.changedToWrong += 1;
        }

        const conf = att.confidence || 'unsure';
        if (conf === 'sure') {
          if (att.isCorrect) confidenceCalibration.sureCorrect += 1;
          else confidenceCalibration.sureWrong += 1;
        } else if (conf === 'guess') {
          if (att.isCorrect) confidenceCalibration.guessCorrect += 1;
          else confidenceCalibration.guessWrong += 1;
        } else {
          if (att.isCorrect) confidenceCalibration.unsureCorrect += 1;
          else confidenceCalibration.unsureWrong += 1;
        }
      }

      const avgPaceSeconds =
        validTimeCount > 0 ? Math.max(1, Math.round(totalValidTimeMs / validTimeCount / 1000)) : 0;

      const { streakDays, todayAttempts } = computeStreakAndTodayAttempts(attempts);

      // Favorite Subspecialty (Chapter with highest attempt volume)
      let favoriteSubspecialty = 'Clinical Cardiology & Hemodynamics';
      let maxChapterAttempts = 0;
      for (const [chapId, count] of chapterCountsMap.entries()) {
        if (count > maxChapterAttempts) {
          maxChapterAttempts = count;
          const chapObj = CVS_TAXONOMY.chapters.find((c) => c.id === chapId);
          if (chapObj) {
            favoriteSubspecialty = chapObj.name;
          }
        }
      }

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

      // Compute Live Per-Subject Readiness
      const answeredSet = new Set(answeredQuestionIds);
      const correctSet = new Set(correctQuestionIds);
      const incorrectSet = new Set(mistakeQuestionIds);
      const subjectReadiness: Record<string, SubjectReadinessStat> = {};

      for (const subj of CVS_TAXONOMY.subjects) {
        const subjQuestions = activeBank.filter((q) => q.subjectId === subj.id);
        const chaptersCount = CVS_TAXONOMY.chapters.filter((c) => c.subjectId === subj.id).length;
        let answeredCount = 0;
        let correctCount = 0;
        let incorrectCount = 0;

        for (const q of subjQuestions) {
          if (answeredSet.has(q.id)) {
            answeredCount += 1;
            if (correctSet.has(q.id)) correctCount += 1;
            else if (incorrectSet.has(q.id)) incorrectCount += 1;
          }
        }

        const totalQ = subjQuestions.length;
        const unansweredCount = Math.max(0, totalQ - answeredCount);
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        const coveragePercent = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
        const masteryPercent = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

        subjectReadiness[subj.id] = {
          subjectId: subj.id,
          subjectName: subj.name,
          chaptersCount,
          totalQuestions: totalQ,
          answeredCount,
          correctCount,
          incorrectCount,
          unansweredCount,
          accuracy,
          coveragePercent,
          masteryPercent,
        };
      }

      // Mastery: proportion of question bank correctly answered at least once
      const masteredQuestions = Array.from(attemptsByQuestion.values()).filter((qAtts) =>
        qAtts.some((a) => a.isCorrect === true)
      ).length;

      const totalQuestionsCount = activeBank.length;
      const masteryPercentage =
        totalQuestionsCount > 0 ? Math.round((masteredQuestions / totalQuestionsCount) * 100) : 0;

      // Count today's AI requests from aiModelMetrics table
      const startOfTodayMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      const dailyAiRequestsUsed = aiMetrics.filter((m) => m.timestamp >= startOfTodayMs).length;

      // Persist real study telemetry snapshot to localStorage so EdgeAuthGateway & Admin Dashboard read real data
      if (typeof window !== 'undefined') {
        try {
          const snapshot = {
            totalAttempts,
            overallAccuracy,
            masteryPercentage,
            weakTopicsCount,
            dueReviewsCount: dueNow > 0 ? dueNow : mistakeQuestionIds.length,
            dailyAiRequestsUsed,
            favoriteSubspecialty,
            avgPaceSeconds,
            streakDays,
            todayAttempts,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(LOCAL_TELEMETRY_STORAGE_KEY, JSON.stringify(snapshot));
        } catch {
          // Ignore quota error
        }
      }

      set({
        totalAttempts,
        totalAnsweredQuestions: uniqueQuestionsAnswered,
        overallAccuracy,
        masteryPercentage,
        weakTopicsCount,
        dueReviewsCount: dueNow > 0 ? dueNow : mistakeQuestionIds.length,
        topicStats,
        subjectReadiness,
        mistakeQuestionIds,
        answeredQuestionIds,
        correctQuestionIds,
        avgPaceSeconds,
        streakDays,
        todayAttempts,
        pacingQuadrants,
        instinctStats,
        confidenceCalibration,
        retentionForecast,
        favoriteSubspecialty,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  getScopeCoverage: (questions: Question[], filter) => {
    const { answeredQuestionIds, correctQuestionIds, mistakeQuestionIds } = get();
    const answeredSet = new Set(answeredQuestionIds);
    const correctSet = new Set(correctQuestionIds);
    const incorrectSet = new Set(mistakeQuestionIds);

    const scopeQuestions = questions.filter((q) => {
      if (filter?.subjectId && filter.subjectId !== 'all' && q.subjectId !== filter.subjectId)
        return false;
      if (filter?.chapterId && filter.chapterId !== 'all' && q.chapterId !== filter.chapterId)
        return false;
      if (filter?.highYieldOnly && !q.highYield) return false;
      return true;
    });

    const unansweredIds: string[] = [];
    const answeredIds: string[] = [];
    const correctIds: string[] = [];
    const incorrectIds: string[] = [];

    for (const q of scopeQuestions) {
      if (answeredSet.has(q.id)) {
        answeredIds.push(q.id);
        if (incorrectSet.has(q.id)) {
          incorrectIds.push(q.id);
        } else if (correctSet.has(q.id)) {
          correctIds.push(q.id);
        }
      } else {
        unansweredIds.push(q.id);
      }
    }

    const total = scopeQuestions.length;
    const answered = answeredIds.length;
    const unanswered = unansweredIds.length;
    const correct = correctIds.length;
    const incorrect = incorrectIds.length;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const percentComplete = total > 0 ? Math.round((answered / total) * 100) : 0;

    return {
      total,
      answered,
      unanswered,
      correct,
      incorrect,
      accuracy,
      percentComplete,
      unansweredIds,
      answeredIds,
      incorrectIds,
      correctIds,
    };
  },

  resetStats: async (questions = []) => {
    set({ isLoading: true });
    try {
      await db.attempts.clear();
      await db.reviewCards.clear();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_TELEMETRY_STORAGE_KEY);
      }
      await get().refreshStats(questions);
    } finally {
      set({ isLoading: false });
    }
  },

  resetSubjectStats: async (subjectId: string, questions = []) => {
    set({ isLoading: true });
    try {
      const subjectQIds = new Set(
        questions.filter((q) => q.subjectId === subjectId).map((q) => q.id)
      );
      if (subjectQIds.size > 0) {
        await db.attempts.where('questionId').anyOf(Array.from(subjectQIds)).delete();
      }
      await get().refreshStats(questions);
    } finally {
      set({ isLoading: false });
    }
  },
}));
