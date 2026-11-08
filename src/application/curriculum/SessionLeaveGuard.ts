/**
 * Session Leave Guard & In-Progress Session Memento (ADR-010-06)
 * SPEC-010: Multi-Block Curriculum Architecture (User Story 4)
 * Path: src/application/curriculum/SessionLeaveGuard.ts
 */

import { create } from 'zustand';
import type { BlockId } from '../../domain/curriculum/ids.ts';

export interface SavedSessionMemento {
  readonly blockId: BlockId;
  readonly sessionId: string;
  readonly mode: 'practice' | 'mock' | 'rapid' | 'retest' | 'exam';
  readonly currentIndex: number;
  readonly questionIds: string[];
  readonly answers: Record<string, { choiceId: string; isCorrect: boolean }>;
  readonly confidences: Record<string, 'guess' | 'unsure' | 'sure'>;
  readonly flags: Record<string, boolean>;
  readonly timeLeftSeconds: number;
  readonly savedAtIso: string;
}

const SAVED_SESSION_KEY_PREFIX = 'medquests_saved_session_v1:';

export function saveSessionMemento(memento: SavedSessionMemento): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      `${SAVED_SESSION_KEY_PREFIX}${memento.blockId}`,
      JSON.stringify(memento)
    );
  } catch (err) {
    console.warn('[SessionLeaveGuard] Failed to save session memento:', err);
  }
}

export function loadSessionMemento(blockId: BlockId): SavedSessionMemento | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${SAVED_SESSION_KEY_PREFIX}${blockId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSessionMemento;
  } catch {
    return null;
  }
}

export function clearSessionMemento(blockId: BlockId): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(`${SAVED_SESSION_KEY_PREFIX}${blockId}`);
  } catch (err) {
    console.warn('[SessionLeaveGuard] Failed to clear session memento:', err);
  }
}

interface SessionLeaveDialogState {
  isOpen: boolean;
  fromBlockId: BlockId;
  toBlockId: BlockId;
  answeredCount: number;
  totalCount: number;
  resolver: ((confirmed: boolean) => void) | null;

  prompt: (params: {
    fromBlockId: BlockId;
    toBlockId: BlockId;
    answeredCount: number;
    totalCount: number;
  }) => Promise<boolean>;
  confirm: () => void;
  cancel: () => void;
}

export const useSessionLeaveDialogStoreBase = create<SessionLeaveDialogState>((set, get) => ({
  isOpen: false,
  fromBlockId: 'cvs' as BlockId,
  toBlockId: 'cns' as BlockId,
  answeredCount: 0,
  totalCount: 0,
  resolver: null,

  prompt: ({ fromBlockId, toBlockId, answeredCount, totalCount }) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        fromBlockId,
        toBlockId,
        answeredCount,
        totalCount,
        resolver: resolve,
      });
    });
  },

  confirm: () => {
    const resolver = get().resolver;
    set({ isOpen: false, resolver: null });
    if (resolver) resolver(true);
  },

  cancel: () => {
    const resolver = get().resolver;
    set({ isOpen: false, resolver: null });
    if (resolver) resolver(false);
  },
}));

export const useSessionLeaveDialogStore = Object.assign(
  function useSessionLeaveDialogStore<U = SessionLeaveDialogState>(
    selector?: (state: SessionLeaveDialogState) => U
  ): U {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const state = useSessionLeaveDialogStoreBase.getState();
      return selector ? selector(state) : (state as unknown as U);
    }
    return useSessionLeaveDialogStoreBase(selector as (state: SessionLeaveDialogState) => U);
  },
  useSessionLeaveDialogStoreBase
) as typeof useSessionLeaveDialogStoreBase;
