/**
 * Mid-Session Leave Guard & Resume Flow Integration Test Suite
 * SPEC-010: Multi-Block Curriculum Architecture (User Story 4)
 * Path: src/ui/features/test/__tests__/sessionLeaveGuard.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SessionLeaveConfirmDialog } from '../../../app/navigation/SessionLeaveConfirmDialog.tsx';
import { Dashboard } from '../../dashboard/Dashboard.tsx';
import {
  saveSessionMemento,
  loadSessionMemento,
  clearSessionMemento,
  useSessionLeaveDialogStore,
  type SavedSessionMemento,
} from '../../../../application/curriculum/SessionLeaveGuard.ts';
import { useBlockContextStore } from '../../../../application/stores/useBlockContextStore.ts';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { db } from '../../../../infrastructure/storage/db.ts';
import type { BlockId } from '../../../../domain/curriculum/ids.ts';

describe('SPEC-010: Mid-Session Switch Protection & Resume Flow (US4)', () => {
  const memoryStorage = new Map<string, string>();

  beforeEach(() => {
    memoryStorage.clear();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => memoryStorage.get(k) ?? null,
        setItem: (k: string, v: string) => memoryStorage.set(k, v),
        removeItem: (k: string) => memoryStorage.delete(k),
      },
    };

    useSessionLeaveDialogStore.setState({
      isOpen: false,
      fromBlockId: 'cvs' as BlockId,
      toBlockId: 'cns' as BlockId,
      answeredCount: 0,
      totalCount: 0,
      resolver: null,
    });

    // Reset Dexie spies
    (vi.spyOn(db.attempts, 'toArray') as any).mockImplementation(async () => []);
    (vi.spyOn(db.attempts, 'where') as any).mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    }));
    (vi.spyOn(db.reviewCards, 'toArray') as any).mockImplementation(async () => []);
    (vi.spyOn(db.reviewCards, 'where') as any).mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    }));
    (vi.spyOn(db.srsCards, 'toArray') as any).mockImplementation(async () => []);
    (vi.spyOn(db.srsCards, 'where') as any).mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [],
        count: async () => 0,
      }),
    }));
    (vi.spyOn(db.aiModelMetrics, 'toArray') as any).mockImplementation(async () => []);
  });

  it('renders nothing when confirmation dialog is closed', () => {
    const html = renderToString(<SessionLeaveConfirmDialog />);
    expect(html).toBe('');
  });

  it('renders confirmation dialog with block names and answered progress when prompt is active', () => {
    useSessionLeaveDialogStore.setState({
      isOpen: true,
      fromBlockId: 'cvs' as BlockId,
      toBlockId: 'cns' as BlockId,
      answeredCount: 7,
      totalCount: 20,
    });

    const html = renderToString(<SessionLeaveConfirmDialog />);
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('Pause Session &amp; Switch Block?');
    expect(cleanHtml).toContain('7/20 answered');
    expect(cleanHtml).toContain('Save &amp; Switch to Central Nervous System');
    expect(cleanHtml).toContain('Stay in Cardiovascular System');
  });

  it('resolves prompt promise with true on confirm and false on cancel', async () => {
    const store = useSessionLeaveDialogStore.getState();

    // 1. Test cancel flow
    const cancelPromise = store.prompt({
      fromBlockId: 'cvs' as BlockId,
      toBlockId: 'cns' as BlockId,
      answeredCount: 3,
      totalCount: 10,
    });
    expect(useSessionLeaveDialogStore.getState().isOpen).toBe(true);
    useSessionLeaveDialogStore.getState().cancel();
    await expect(cancelPromise).resolves.toBe(false);
    expect(useSessionLeaveDialogStore.getState().isOpen).toBe(false);

    // 2. Test confirm flow
    const confirmPromise = store.prompt({
      fromBlockId: 'cvs' as BlockId,
      toBlockId: 'cns' as BlockId,
      answeredCount: 8,
      totalCount: 20,
    });
    expect(useSessionLeaveDialogStore.getState().isOpen).toBe(true);
    useSessionLeaveDialogStore.getState().confirm();
    await expect(confirmPromise).resolves.toBe(true);
    expect(useSessionLeaveDialogStore.getState().isOpen).toBe(false);
  });

  it('saves, loads, and clears session memento across blocks independently', () => {
    const cvsSession: SavedSessionMemento = {
      blockId: 'cvs' as BlockId,
      sessionId: 'sess-cvs-1',
      mode: 'practice',
      currentIndex: 4,
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
      answers: {
        q1: { choiceId: 'a', isCorrect: true },
        q2: { choiceId: 'b', isCorrect: false },
      },
      confidences: { q1: 'sure', q2: 'unsure' },
      flags: { q2: true },
      timeLeftSeconds: 1100,
      savedAtIso: new Date().toISOString(),
    };

    saveSessionMemento(cvsSession);

    const loaded = loadSessionMemento('cvs' as BlockId);
    expect(loaded).toBeDefined();
    expect(loaded?.sessionId).toBe('sess-cvs-1');
    expect(loaded?.currentIndex).toBe(4);
    expect(Object.keys(loaded?.answers || {}).length).toBe(2);

    // Other blocks remain empty
    expect(loadSessionMemento('cns' as BlockId)).toBeNull();

    // Clear
    clearSessionMemento('cvs' as BlockId);
    expect(loadSessionMemento('cvs' as BlockId)).toBeNull();
  });

  it('renders "Resume In-Progress Session" card on Dashboard when saved session exists for active block', () => {
    useBlockContextStore.setState({ activeBlockId: 'cvs' as BlockId });
    useQuestionStore.setState({ questions: [], activeBlockId: 'cvs' });

    const cvsSession: SavedSessionMemento = {
      blockId: 'cvs' as BlockId,
      sessionId: 'sess-cvs-1',
      mode: 'practice',
      currentIndex: 3,
      questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
      answers: {
        q1: { choiceId: 'a', isCorrect: true },
        q2: { choiceId: 'b', isCorrect: false },
      },
      confidences: { q1: 'sure', q2: 'unsure' },
      flags: {},
      timeLeftSeconds: 900,
      savedAtIso: new Date().toISOString(),
    };
    saveSessionMemento(cvsSession);

    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('In-Progress PRACTICE');
    expect(cleanHtml).toContain('2 / 5 Answered');
    expect(cleanHtml).toContain('Resume your paused practice session');
    expect(cleanHtml).toContain('Resume Session');
    expect(cleanHtml).toContain('Discard');
  });
});
