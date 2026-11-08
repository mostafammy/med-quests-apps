import { db } from '../../../infrastructure/storage/db.ts';
import type { Confidence, Question, ReviewCard } from '../../../domain/model/types.ts';
import type { SavedSessionMemento } from '../../../application/curriculum/SessionLeaveGuard.ts';
import { DexieBlockScopedAttemptRepository } from '../../../infrastructure/storage/DexieBlockScopedRepositories.ts';
import { useBlockContextStore } from '../../../application/stores/useBlockContextStore.ts';
import type { BlockId } from '../../../domain/curriculum/ids.ts';

export interface SessionConfig {
  mode?: 'practice' | 'mock' | 'rapid' | 'retest' | 'exam';
  subjectId?: string;
  chapterId?: string;
  questionCount?: number | 'all';
  timeLimitMinutes?: number;
  highYieldOnly?: boolean;
  questionFilter?: 'all' | 'unanswered' | 'incorrect';
  questionIds?: string[];
  blockId?: string;
  savedSession?: SavedSessionMemento;
}

export async function upsertSm2ReviewCard(
  questionId: string,
  blockId: string,
  isCorrect: boolean,
  confidence: Confidence
): Promise<void> {
  try {
    const existing = await db.reviewCards.get(questionId);
    const now = new Date();
    let easeFactor = existing?.easeFactor ?? 2.5;
    let repetitions = existing?.repetitions ?? 0;
    let lapses = existing?.lapses ?? 0;
    let intervalDays = existing?.intervalDays ?? 0;

    if (isCorrect) {
      const quality = confidence === 'sure' ? 5 : confidence === 'unsure' ? 4 : 3;
      if (repetitions === 0) {
        intervalDays = confidence === 'sure' ? 3 : 1;
      } else if (repetitions === 1) {
        intervalDays = confidence === 'sure' ? 6 : 3;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
      }
      repetitions += 1;
      easeFactor = Math.max(
        1.3,
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
    } else {
      repetitions = 0;
      lapses += 1;
      intervalDays = 0; // Due immediately for spaced repetition review
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const dueAt = new Date(now.getTime() + intervalDays * 86_400_000).toISOString();
    const updatedCard: ReviewCard = {
      questionId,
      blockId,
      easeFactor: Number(easeFactor.toFixed(2)),
      intervalDays,
      repetitions,
      lapses,
      dueAt,
      lastReviewedAt: now.toISOString(),
    };
    await db.reviewCards.put(updatedCard);
  } catch (err) {
    console.warn('SM-2 review card update skipped:', err);
  }
}

export function formatSessionCountdownTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function computeInitialSessionQuestions(
  allQuestions: ReadonlyArray<Question>,
  sessionConfig: SessionConfig
): Question[] {
  const targetQIds = sessionConfig.savedSession?.questionIds || sessionConfig.questionIds;
  if (targetQIds && targetQIds.length > 0) {
    const idSet = new Set(targetQIds);
    const ordered = allQuestions.filter((q) => idSet.has(q.id));
    const rawCount = sessionConfig.questionCount;
    const count =
      rawCount === 'all'
        ? ordered.length
        : typeof rawCount === 'number'
        ? rawCount
        : ordered.length;
    return ordered.slice(0, count);
  }

  let pool = [...allQuestions];
  if (sessionConfig.subjectId && sessionConfig.subjectId !== 'all') {
    pool = pool.filter((q) => q.subjectId === sessionConfig.subjectId);
  }
  if (sessionConfig.chapterId && sessionConfig.chapterId !== 'all') {
    pool = pool.filter((q) => q.chapterId === sessionConfig.chapterId);
  }
  if (sessionConfig.highYieldOnly) {
    const hyPool = pool.filter((q) => q.highYield);
    if (hyPool.length > 0) {
      pool = hyPool;
    }
  }

  const rawCount = sessionConfig.questionCount;
  const count =
    rawCount === 'all'
      ? pool.length
      : typeof rawCount === 'number'
      ? rawCount
      : 20;
  return pool.slice(0, count);
}

export async function resolveAsyncFilteredSessionQuestions(
  allQuestions: ReadonlyArray<Question>,
  sessionConfig: SessionConfig
): Promise<Question[]> {
  if (sessionConfig.questionIds && sessionConfig.questionIds.length > 0) {
    const idSet = new Set(sessionConfig.questionIds);
    const ordered = allQuestions.filter((q) => idSet.has(q.id));
    const rawCount = sessionConfig.questionCount;
    const count =
      rawCount === 'all'
        ? ordered.length
        : typeof rawCount === 'number'
        ? rawCount
        : ordered.length;
    return ordered.slice(0, count);
  }

  let pool = [...allQuestions];
  if (sessionConfig.subjectId && sessionConfig.subjectId !== 'all') {
    pool = pool.filter((q) => q.subjectId === sessionConfig.subjectId);
  }
  if (sessionConfig.chapterId && sessionConfig.chapterId !== 'all') {
    pool = pool.filter((q) => q.chapterId === sessionConfig.chapterId);
  }
  if (sessionConfig.highYieldOnly) {
    const hyPool = pool.filter((q) => q.highYield);
    if (hyPool.length > 0) {
      pool = hyPool;
    }
  }

  const qFilter = sessionConfig.questionFilter || 'all';
  if (qFilter !== 'all') {
    const targetBlockId = (sessionConfig.blockId ||
      useBlockContextStore.getState().activeBlockId ||
      'cvs') as BlockId;
    const attemptRepo = new DexieBlockScopedAttemptRepository(targetBlockId);
    const attempts = await attemptRepo.all();
    const attemptsByQ = new Map<string, Array<{ questionId: string; answeredAt: string; isCorrect: boolean }>>();
    for (const rawAttempt of attempts) {
      const a = rawAttempt as { questionId: string; answeredAt: string; isCorrect: boolean };
      const list = attemptsByQ.get(a.questionId) || [];
      list.push(a);
      attemptsByQ.set(a.questionId, list);
    }

    if (qFilter === 'unanswered') {
      pool = pool.filter((q) => !attemptsByQ.has(q.id));
    } else if (qFilter === 'incorrect') {
      pool = pool.filter((q) => {
        const atts = attemptsByQ.get(q.id);
        if (!atts || atts.length === 0) return false;
        const sorted = [...atts].sort(
          (a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
        );
        return sorted[0]?.isCorrect === false;
      });
    }
  }

  const rawCount = sessionConfig.questionCount;
  const count =
    rawCount === 'all'
      ? pool.length
      : typeof rawCount === 'number'
      ? rawCount
      : 20;
  return pool.slice(0, count);
}
