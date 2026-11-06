/**
 * Multi-Block Study History Isolation & Global Streak Continuity Test Suite
 * SPEC-010: Multi-Block Curriculum Architecture (User Story 2)
 * Path: src/application/stores/__tests__/multiBlockStatsIsolation.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStatsStore } from '../useStatsStore.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import type { Attempt, ReviewCard } from '../../../domain/model/types.ts';
import type { BlockId } from '../../../domain/curriculum/ids.ts';

function createMockAttempt(params: {
  id: string;
  blockId: string;
  questionId: string;
  isCorrect: boolean;
  answeredAt?: string;
}): Attempt {
  return {
    id: params.id,
    blockId: params.blockId,
    questionId: params.questionId,
    sessionId: 'session-test',
    mode: 'practice',
    isCorrect: params.isCorrect,
    selectedChoiceId: 'a',
    responseTimeMs: 20000,
    confidence: 'sure',
    answeredAt: params.answeredAt || new Date().toISOString(),
  };
}

describe('SPEC-010: Multi-Block Study History Isolation (US2)', () => {
  let mockAttempts: Attempt[] = [];
  let mockReviewCards: ReviewCard[] = [];

  beforeEach(() => {
    mockAttempts = [];
    mockReviewCards = [];

    // Mock db.attempts
    (vi.spyOn(db.attempts, 'toArray') as any).mockImplementation(async () => [...mockAttempts]);
    (vi.spyOn(db.attempts, 'bulkPut') as any).mockImplementation(async (items: Attempt[]) => {
      for (const item of items) {
        const idx = mockAttempts.findIndex((a) => a.id === item.id);
        if (idx >= 0) mockAttempts[idx] = item;
        else mockAttempts.push(item);
      }
    });
    (vi.spyOn(db.attempts, 'clear') as any).mockImplementation(async () => {
      mockAttempts = [];
    });
    (vi.spyOn(db.attempts, 'where') as any).mockImplementation((indexOrField: string) => {
      if (indexOrField === 'blockId') {
        return {
          equals: (val: any) => ({
            toArray: async () => mockAttempts.filter((a) => a.blockId === val),
            count: async () => mockAttempts.filter((a) => a.blockId === val).length,
            delete: async () => {
              mockAttempts = mockAttempts.filter((a) => a.blockId !== val);
              return 0;
            },
          }),
        };
      }
      if (indexOrField === 'answeredAt') {
        return {
          aboveOrEqual: (val: string) => ({
            toArray: async () => mockAttempts.filter((a) => a.answeredAt && a.answeredAt >= val),
          }),
        };
      }
      return {
        equals: () => ({ toArray: async () => [] }),
      };
    });

    // Mock db.reviewCards
    (vi.spyOn(db.reviewCards, 'toArray') as any).mockImplementation(async () => [...mockReviewCards]);
    (vi.spyOn(db.reviewCards, 'bulkPut') as any).mockImplementation(async (items: ReviewCard[]) => {
      for (const item of items) {
        const idx = mockReviewCards.findIndex((r) => r.questionId === item.questionId);
        if (idx >= 0) mockReviewCards[idx] = item;
        else mockReviewCards.push(item);
      }
    });
    (vi.spyOn(db.reviewCards, 'clear') as any).mockImplementation(async () => {
      mockReviewCards = [];
    });
    (vi.spyOn(db.reviewCards, 'where') as any).mockImplementation((indexOrField: string) => {
      if (indexOrField === 'blockId') {
        return {
          equals: (val: any) => ({
            toArray: async () => mockReviewCards.filter((r) => r.blockId === val),
            count: async () => mockReviewCards.filter((r) => r.blockId === val).length,
            delete: async () => {
              mockReviewCards = mockReviewCards.filter((r) => r.blockId !== val);
              return 0;
            },
          }),
        };
      }
      return {
        equals: () => ({ toArray: async () => [] }),
      };
    });

    // Mock db.srsCards & db.aiModelMetrics
    (vi.spyOn(db.srsCards, 'toArray') as any).mockImplementation(async () => []);
    (vi.spyOn(db.srsCards, 'where') as any).mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
        delete: async () => 0,
      }),
    }));
    (vi.spyOn(db.aiModelMetrics, 'toArray') as any).mockImplementation(async () => []);
  });

  it('isolates block accuracy and attempts between CVS and CNS while maintaining global streak and today count', async () => {
    const todayIso = new Date().toISOString();

    // 1. Seed 5 attempts in CVS (3 correct, 2 wrong -> 60% accuracy)
    const cvsAttempts: Attempt[] = [
      createMockAttempt({ id: 'att-cvs-1', blockId: 'cvs', questionId: 'cvs-q1', isCorrect: true, answeredAt: todayIso }),
      createMockAttempt({ id: 'att-cvs-2', blockId: 'cvs', questionId: 'cvs-q2', isCorrect: true, answeredAt: todayIso }),
      createMockAttempt({ id: 'att-cvs-3', blockId: 'cvs', questionId: 'cvs-q3', isCorrect: true, answeredAt: todayIso }),
      createMockAttempt({ id: 'att-cvs-4', blockId: 'cvs', questionId: 'cvs-q4', isCorrect: false, answeredAt: todayIso }),
      createMockAttempt({ id: 'att-cvs-5', blockId: 'cvs', questionId: 'cvs-q5', isCorrect: false, answeredAt: todayIso }),
    ];
    await db.attempts.bulkPut(cvsAttempts);

    // Refresh stats for CVS
    await useStatsStore.getState().refreshStats([], 'cvs' as BlockId);
    let state = useStatsStore.getState();

    expect(state.totalAttempts).toBe(5);
    expect(state.overallAccuracy).toBe(60);
    expect(state.todayAttempts).toBe(5);
    expect(state.streakDays).toBe(1);

    // 2. Seed 2 attempts in CNS (2 correct, 0 wrong -> 100% accuracy)
    const cnsAttempts: Attempt[] = [
      createMockAttempt({ id: 'att-cns-1', blockId: 'cns', questionId: 'cns-q1', isCorrect: true, answeredAt: todayIso }),
      createMockAttempt({ id: 'att-cns-2', blockId: 'cns', questionId: 'cns-q2', isCorrect: true, answeredAt: todayIso }),
    ];
    await db.attempts.bulkPut(cnsAttempts);

    // Refresh stats for CNS
    await useStatsStore.getState().refreshStats([], 'cns' as BlockId);
    state = useStatsStore.getState();

    // CNS block metrics are fresh: 2 attempts, 100% accuracy
    expect(state.totalAttempts).toBe(2);
    expect(state.overallAccuracy).toBe(100);
    // Learner-global metrics combine all attempts: 5 + 2 = 7 today
    expect(state.todayAttempts).toBe(7);
    expect(state.streakDays).toBe(1);

    // 3. Switch back to CVS; assert all CVS metrics are 100% intact
    await useStatsStore.getState().refreshStats([], 'cvs' as BlockId);
    state = useStatsStore.getState();

    expect(state.totalAttempts).toBe(5);
    expect(state.overallAccuracy).toBe(60);
    // Global today attempts remains 7
    expect(state.todayAttempts).toBe(7);
  });

  it('isolates review cards and due reviews per block', async () => {
    const dueNow = new Date(Date.now() - 1000).toISOString();
    const futureDue = new Date(Date.now() + 86400000 * 5).toISOString();

    const cvsCard: ReviewCard = {
      blockId: 'cvs',
      questionId: 'cvs-q1',
      dueAt: dueNow,
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 1,
      lapses: 0,
      lastReviewedAt: new Date().toISOString(),
    };

    const cnsCard: ReviewCard = {
      blockId: 'cns',
      questionId: 'cns-q1',
      dueAt: futureDue,
      intervalDays: 5,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      lastReviewedAt: new Date().toISOString(),
    };

    await db.reviewCards.bulkPut([cvsCard, cnsCard]);

    // Check CVS stats
    await useStatsStore.getState().refreshStats([], 'cvs' as BlockId);
    expect(useStatsStore.getState().dueReviewsCount).toBe(1);

    // Check CNS stats (card is in 5 days, so 0 due now)
    await useStatsStore.getState().refreshStats([], 'cns' as BlockId);
    expect(useStatsStore.getState().dueReviewsCount).toBe(0);
  });

  it('resetStats wipes records only for the target block, preserving other blocks', async () => {
    await db.attempts.bulkPut([
      createMockAttempt({ id: 'att-1', blockId: 'cvs', questionId: 'cvs-q1', isCorrect: true }),
      createMockAttempt({ id: 'att-2', blockId: 'cns', questionId: 'cns-q1', isCorrect: true }),
    ]);

    // Reset stats for CNS
    await useStatsStore.getState().resetStats([], 'cns' as BlockId);

    // CNS attempts are wiped
    const cnsAttempts = await db.attempts.where('blockId').equals('cns').toArray();
    expect(cnsAttempts.length).toBe(0);

    // CVS attempts are completely preserved!
    const cvsAttempts = await db.attempts.where('blockId').equals('cvs').toArray();
    expect(cvsAttempts.length).toBe(1);
    expect(cvsAttempts[0].id).toBe('att-1');
  });
});
