import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../../infrastructure/storage/db.ts';
import { useStatsStore, broadcastTelemetryUpdate } from '../useStatsStore.ts';
import { useQuestionStore } from '../useQuestionStore.ts';
import { Dashboard } from '../../../ui/features/dashboard/Dashboard.tsx';
import defaultCvsBank from '../../../../content/cvs/dist/bank.v1.json';
import type { Question, Attempt } from '../../../domain/model/types.ts';

describe('Stats Store & Subject Cards Live Calibration Test', () => {
  const bank = defaultCvsBank as Question[];
  let mockAttempts: Attempt[] = [];

  beforeEach(() => {
    mockAttempts = [];
    vi.spyOn(db.attempts, 'toArray').mockImplementation((async () => mockAttempts) as any);
    vi.spyOn(db.attempts, 'where').mockImplementation(((field: string) => ({
      equals: (val: any) => ({
        toArray: async () => mockAttempts.filter((a) => (a as any)[field] === val),
        count: async () => mockAttempts.filter((a) => (a as any)[field] === val).length,
      }),
    })) as any);
    vi.spyOn(db.reviewCards, 'toArray').mockImplementation((async () => []) as any);
    vi.spyOn(db.reviewCards, 'where').mockImplementation((() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    })) as any);
    vi.spyOn(db.srsCards, 'toArray').mockImplementation((async () => []) as any);
    vi.spyOn(db.srsCards, 'where').mockImplementation((() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    })) as any);
    vi.spyOn(db.aiModelMetrics, 'toArray').mockImplementation((async () => []) as any);

    useQuestionStore.setState({
      questions: bank,
      activeBlockId: 'cvs',
      isLoading: false,
    });
  });

  it('safely handles parameterless refreshStats() using question store fallback', async () => {
    // Calling refreshStats without passing questions should not throw and correctly compute metrics
    await expect(useStatsStore.getState().refreshStats()).resolves.not.toThrow();
    const anatomy = useStatsStore.getState().subjectReadiness.anatomy;
    expect(anatomy.totalQuestions).toBe(56);
    expect(anatomy.answeredCount).toBe(0);
  });

  it('updates subject readiness when an attempt is added and refreshStats is called', async () => {
    // 1. Initial refresh with zero attempts
    await useStatsStore.getState().refreshStats(bank);
    const initialAnatomy = useStatsStore.getState().subjectReadiness.anatomy;
    expect(initialAnatomy.answeredCount).toBe(0);
    expect(initialAnatomy.correctCount).toBe(0);
    expect(initialAnatomy.totalQuestions).toBe(56);

    // 2. Add an attempt for an anatomy question
    const anatomyQ = bank.find((q) => q.subjectId === 'anatomy')!;
    expect(anatomyQ).toBeDefined();

    mockAttempts.push({
      id: `att-test-${anatomyQ.id}`,
      questionId: anatomyQ.id,
      blockId: 'cvs',
      sessionId: 'practice-session',
      mode: 'practice',
      selectedChoiceId: 'a',
      isCorrect: true,
      confidence: 'sure',
      responseTimeMs: 3000,
      answeredAt: new Date().toISOString(),
    });

    // 3. Refresh stats without arguments
    await useStatsStore.getState().refreshStats();
    const updatedAnatomy = useStatsStore.getState().subjectReadiness.anatomy;

    expect(updatedAnatomy.answeredCount).toBe(1);
    expect(updatedAnatomy.correctCount).toBe(1);
    expect(updatedAnatomy.accuracy).toBe(100);
  });

  it('updates all four faculty calibration cards independently based on question subject', async () => {
    const subjects = ['anatomy', 'histology', 'microbiology', 'physiology'] as const;

    for (const subj of subjects) {
      const q = bank.find((item) => item.subjectId === subj)!;
      expect(q).toBeDefined();
      mockAttempts.push({
        id: `att-${subj}-${q.id}`,
        questionId: q.id,
        blockId: 'cvs',
        sessionId: 'multi-subject-session',
        mode: 'practice',
        selectedChoiceId: 'a',
        isCorrect: true,
        confidence: 'sure',
        responseTimeMs: 2500,
        answeredAt: new Date().toISOString(),
      });
    }

    await useStatsStore.getState().refreshStats();
    const readiness = useStatsStore.getState().subjectReadiness;

    expect(readiness.anatomy.answeredCount).toBe(1);
    expect(readiness.anatomy.totalQuestions).toBe(56);

    expect(readiness.histology.answeredCount).toBe(1);
    expect(readiness.histology.totalQuestions).toBe(26);

    expect(readiness.microbiology.answeredCount).toBe(1);
    expect(readiness.microbiology.totalQuestions).toBe(24);

    expect(readiness.physiology.answeredCount).toBe(1);
    expect(readiness.physiology.totalQuestions).toBe(106);
  });

  it('verifies Dashboard rendering of the subject cards and dynamic CTA before and after solving questions', async () => {
    // 1. Initial state: zero attempts
    await useStatsStore.getState().refreshStats(bank);
    let html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );
    let cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('0/56 Attempted');
    expect(cleanHtml).toContain('0✓ / 0✗');
    expect(cleanHtml).toContain('Start Practice →');

    // 2. Add an attempt
    const anatomyQ = bank.find((q) => q.subjectId === 'anatomy')!;
    mockAttempts.push({
      id: `att-test-${anatomyQ.id}`,
      questionId: anatomyQ.id,
      blockId: 'cvs',
      sessionId: 'practice-session',
      mode: 'practice',
      selectedChoiceId: 'a',
      isCorrect: true,
      confidence: 'sure',
      responseTimeMs: 3000,
      answeredAt: new Date().toISOString(),
    });

    // 3. Call refreshStats
    await useStatsStore.getState().refreshStats(bank);

    // 4. Re-render Dashboard
    html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );
    cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('1/56 Attempted');
    expect(cleanHtml).toContain('1✓ / 0✗');
    expect(cleanHtml).toContain('Continue Practice →');
  });

  it('dispatches telemetry updated events when broadcastTelemetryUpdate is executed', () => {
    const originalWindow = (globalThis as any).window;
    const mockDispatch = vi.fn();
    (globalThis as any).window = {
      dispatchEvent: mockDispatch,
    };
    try {
      broadcastTelemetryUpdate();
      expect(mockDispatch).toHaveBeenCalled();
      const event = mockDispatch.mock.calls[0]?.[0];
      expect(event.type).toBe('medquests:telemetry-updated');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });
});
