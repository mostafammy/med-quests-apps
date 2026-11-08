import { create } from 'zustand';
import { db } from '../../infrastructure/storage/db.ts';
import { Question, Attempt, Taxonomy, ReviewCard } from '../../domain/model/types.ts';
import { CVS_TAXONOMY } from '../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from './useQuestionStore.ts';
import { useBlockContextStore } from './useBlockContextStore.ts';
import { compositionRoot } from '../composition/clientCompositionRoot.ts';
import { LegacyTaxonomyAdapter } from '../../domain/curriculum/LegacyTaxonomyAdapter.ts';
import { useLocaleStore } from './useLocaleStore.ts';
import {
  DexieBlockScopedAttemptRepository,
  DexieBlockScopedReviewCardRepository,
  DexieBlockScopedSrsRepository,
  DexieLearnerGlobalActivityReader,
} from '../../infrastructure/storage/DexieBlockScopedRepositories.ts';
import type { BlockId } from '../../domain/curriculum/ids.ts';
import {
  RetentionForecastMetrics,
  computeRetentionForecast,
} from '../../domain/stats/spacedRepetitionCalculator.ts';
import {
  TopicStat,
  SubjectReadinessStat,
  PacingQuadrantMetrics,
  InstinctMetrics,
  ConfidenceCalibrationMetrics,
  ScopeCoverageSummary,
  buildDefaultSubjectReadiness,
  computeStreakAndTodayAttempts,
  computeCognitiveAndPacingMetrics,
  computeScopeCoverage,
} from '../../domain/stats/cognitiveMetricsCalculator.ts';

export type {
  TopicStat,
  SubjectReadinessStat,
  PacingQuadrantMetrics,
  InstinctMetrics,
  ConfidenceCalibrationMetrics,
  RetentionForecastMetrics,
  ScopeCoverageSummary,
};

export const LOCAL_TELEMETRY_STORAGE_KEY = 'medquests_local_study_telemetry_v1';

export function broadcastTelemetryUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('medquests:telemetry-updated'));
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('medquests_study_telemetry');
        bc.postMessage({ type: 'TELEMETRY_UPDATED', timestamp: Date.now() });
        bc.close();
      }
    } catch {
      // Ignore broadcast errors in unsupported environments
    }
  }
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
  refreshStats: (questions?: Question[], blockId?: string) => Promise<void>;
  resetStats: (questions?: Question[], blockId?: string) => Promise<void>;
  resetSubjectStats: (subjectId: string, questions?: Question[], blockId?: string) => Promise<void>;
  getScopeCoverage: (
    questions: Question[],
    filter?: {
      subjectId?: string;
      chapterId?: string;
      highYieldOnly?: boolean;
    }
  ) => ScopeCoverageSummary;
}

export const useStatsStoreBase = create<StatsState>((set, get) => ({
  totalAttempts: 0,
  totalAnsweredQuestions: 0,
  overallAccuracy: 0,
  masteryPercentage: 0,
  weakTopicsCount: 0,
  dueReviewsCount: 0,
  topicStats: [],
  subjectReadiness: buildDefaultSubjectReadiness(CVS_TAXONOMY, []),
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
  favoriteSubspecialty: 'Clinical Cardiology & Hemodynamics',
  isLoading: false,

  refreshStats: async (questions?: Question[], blockId?: string) => {
    set({ isLoading: true });
    try {
      const targetBlockId = (blockId || useBlockContextStore.getState().activeBlockId || 'cvs') as BlockId;
      const pack = compositionRoot.catalog.get(targetBlockId);
      const locale = useLocaleStore.getState().locale;
      const taxonomy: Taxonomy = pack
        ? LegacyTaxonomyAdapter.manifestToTaxonomy(pack.manifest, locale)
        : CVS_TAXONOMY;

      const activeBank = questions && questions.length > 0
        ? questions
        : useQuestionStore.getState().questions;

      const attemptRepo = new DexieBlockScopedAttemptRepository(targetBlockId);
      const reviewRepo = new DexieBlockScopedReviewCardRepository(targetBlockId);
      const srsRepo = new DexieBlockScopedSrsRepository(targetBlockId);
      const globalReader = new DexieLearnerGlobalActivityReader();

      const [attempts, reviewCards, srsCards, globalAttempts, aiMetrics] = await Promise.all([
        (attemptRepo.all().catch(() => []) as Promise<Attempt[]>),
        (reviewRepo.all().catch(() => []) as Promise<ReviewCard[]>),
        srsRepo.all().catch(() => []),
        (globalReader.allAttempts().catch(() => []) as Promise<Attempt[]>),
        db.aiModelMetrics.toArray().catch(() => []),
      ]);

      const { retentionForecast, dueNow } = computeRetentionForecast(reviewCards, srsCards);
      const { streakDays, todayAttempts } = computeStreakAndTodayAttempts(globalAttempts);

      const cognitiveMetrics = computeCognitiveAndPacingMetrics(
        attempts,
        activeBank,
        taxonomy
      );

      const effectiveDueCount = dueNow > 0 ? dueNow : cognitiveMetrics.mistakeQuestionIds.length;

      // Count today's AI requests from aiModelMetrics table
      const startOfTodayMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      const dailyAiRequestsUsed = aiMetrics.filter((m) => m.timestamp >= startOfTodayMs).length;

      // Persist real study telemetry snapshot to localStorage
      if (typeof window !== 'undefined') {
        try {
          const snapshot = {
            totalAttempts: cognitiveMetrics.totalAttempts,
            overallAccuracy: cognitiveMetrics.overallAccuracy,
            masteryPercentage: cognitiveMetrics.masteryPercentage,
            weakTopicsCount: cognitiveMetrics.weakTopicsCount,
            dueReviewsCount: effectiveDueCount,
            dailyAiRequestsUsed,
            favoriteSubspecialty: cognitiveMetrics.favoriteSubspecialty,
            avgPaceSeconds: cognitiveMetrics.avgPaceSeconds,
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
        ...cognitiveMetrics,
        dueReviewsCount: effectiveDueCount,
        streakDays,
        todayAttempts,
        retentionForecast,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  getScopeCoverage: (questions: Question[], filter) => {
    const { answeredQuestionIds, correctQuestionIds, mistakeQuestionIds } = get();
    return computeScopeCoverage(
      questions,
      answeredQuestionIds,
      correctQuestionIds,
      mistakeQuestionIds,
      filter
    );
  },

  resetStats: async (questions?: Question[], blockId?: string) => {
    set({ isLoading: true });
    try {
      const targetBlockId = (blockId || useBlockContextStore.getState().activeBlockId || 'cvs') as BlockId;
      await db.attempts.where('blockId').equals(targetBlockId).delete();
      await db.reviewCards.where('blockId').equals(targetBlockId).delete();
      await db.srsCards.where('blockId').equals(targetBlockId).delete();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_TELEMETRY_STORAGE_KEY);
      }
      const activeBank = questions && questions.length > 0
        ? questions
        : useQuestionStore.getState().questions;
      await get().refreshStats(activeBank, targetBlockId);
      broadcastTelemetryUpdate();
    } finally {
      set({ isLoading: false });
    }
  },

  resetSubjectStats: async (subjectId: string, questions?: Question[], blockId?: string) => {
    set({ isLoading: true });
    try {
      const targetBlockId = (blockId || useBlockContextStore.getState().activeBlockId || 'cvs') as BlockId;
      const activeBank = questions && questions.length > 0
        ? questions
        : useQuestionStore.getState().questions;
      const subjectQIds = new Set(
        activeBank.filter((q) => q.subjectId === subjectId).map((q) => q.id)
      );
      if (subjectQIds.size > 0) {
        await db.attempts
          .where('questionId')
          .anyOf(Array.from(subjectQIds))
          .filter((att) => att.blockId === targetBlockId)
          .delete();
      }
      await get().refreshStats(activeBank, targetBlockId);
      broadcastTelemetryUpdate();
    } finally {
      set({ isLoading: false });
    }
  },
}));

export const useStatsStore = Object.assign(
  function useStatsStore<U = StatsState>(selector?: (state: StatsState) => U): U {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const state = useStatsStoreBase.getState();
      return selector ? selector(state) : (state as unknown as U);
    }
    return useStatsStoreBase(selector as (state: StatsState) => U);
  },
  useStatsStoreBase
) as typeof useStatsStoreBase;
