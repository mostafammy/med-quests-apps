/**
 * LocalStorage Block Memento Store
 * Preserves per-block UI filters and testing context (ADR-010-05)
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockId } from '../../domain/curriculum/ids.ts';

export interface BlockSessionMemento {
  readonly blockId: BlockId;
  readonly testHub: {
    readonly subjectId: string;
    readonly chapterId: string;
    readonly count: number | 'all';
    readonly highYieldOnly: boolean;
  };
  readonly reviewTab: string | null;
  readonly savedAtIso: string;
}

export interface IBlockMementoStore {
  load(blockId: BlockId): BlockSessionMemento | null;
  save(memento: BlockSessionMemento): void;
}

const MEMENTO_KEY_PREFIX = 'medquests_block_memento_v1:';

export class LocalStorageBlockMementoStore implements IBlockMementoStore {
  public load(blockId: BlockId): BlockSessionMemento | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(`${MEMENTO_KEY_PREFIX}${blockId}`);
      if (!raw) return null;
      return JSON.parse(raw) as BlockSessionMemento;
    } catch {
      return null;
    }
  }

  public save(memento: BlockSessionMemento): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(
        `${MEMENTO_KEY_PREFIX}${memento.blockId}`,
        JSON.stringify(memento)
      );
    } catch (err) {
      console.warn('[LocalStorageBlockMementoStore] Failed to save memento:', err);
    }
  }
}

export const defaultBlockMementoStore = new LocalStorageBlockMementoStore();
