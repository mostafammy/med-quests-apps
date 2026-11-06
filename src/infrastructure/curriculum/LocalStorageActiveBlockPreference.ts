/**
 * Browser LocalStorage Active Block Preference
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { BlockId, BlockIdSchema } from '../../domain/curriculum/ids.ts';

export const ACTIVE_BLOCK_STORAGE_KEY = 'medquests_active_block_v1';
export const BLOCK_CONTEXT_CHANNEL_NAME = 'medquests_block_context';

export interface IActiveBlockPreference {
  read(): BlockId | null;
  write(blockId: BlockId): void;
  subscribe(listener: (blockId: BlockId) => void): () => void;
}

export class LocalStorageActiveBlockPreference implements IActiveBlockPreference {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(blockId: BlockId) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(BLOCK_CONTEXT_CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent) => {
          if (event.data?.type === 'ACTIVE_BLOCK_CHANGED' && event.data?.blockId) {
            const parsed = BlockIdSchema.safeParse(event.data.blockId);
            if (parsed.success) {
              this.notify(parsed.data);
            }
          }
        };
      } catch {
        // Fallback for environments where BroadcastChannel is unavailable
      }
    }
  }

  public read(): BlockId | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      const stored = window.localStorage.getItem(ACTIVE_BLOCK_STORAGE_KEY);
      if (!stored) return null;
      const parsed = BlockIdSchema.safeParse(stored);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  public write(blockId: BlockId): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(ACTIVE_BLOCK_STORAGE_KEY, blockId);
      } catch (err) {
        console.warn('[LocalStorageActiveBlockPreference] Failed to save active block:', err);
      }
    }

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'ACTIVE_BLOCK_CHANGED',
          blockId,
          timestamp: Date.now(),
        });
      } catch {
        // Ignore channel postMessage errors
      }
    }
  }

  public subscribe(listener: (blockId: BlockId) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(blockId: BlockId): void {
    for (const listener of this.listeners) {
      try {
        listener(blockId);
      } catch (err) {
        console.error('[LocalStorageActiveBlockPreference] Listener error:', err);
      }
    }
  }
}

export const defaultActiveBlockPreference = new LocalStorageActiveBlockPreference();
