/**
 * Switch Block Use Case (Two-Phase Atomic Orchestrator)
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockId } from '../../domain/curriculum/ids.ts';
import type { IBlockCatalogReader } from '../../domain/curriculum/BlockCatalog.ts';
import type { IActiveBlockPreference } from '../../infrastructure/curriculum/LocalStorageActiveBlockPreference.ts';
import type { IBlockHydrationParticipant } from './hydrationParticipants.ts';

export type BlockSwitchReason =
  | 'user-switcher'
  | 'deep-link'
  | 'cross-tab'
  | 'boot'
  | 'fallback-unavailable';

export type BlockSwitchError =
  | { readonly code: 'unknown-block'; readonly blockId: string }
  | { readonly code: 'not-visible'; readonly blockId: BlockId }
  | { readonly code: 'pack-load-failed'; readonly blockId: BlockId; readonly cause: string }
  | { readonly code: 'hydration-failed'; readonly blockId: BlockId; readonly cause: string }
  | { readonly code: 'superseded'; readonly byEpoch: number }
  | { readonly code: 'cancelled-by-user' };

export type BlockSwitchOutcome =
  | { readonly kind: 'committed'; readonly to: BlockId; readonly durationMs: number; readonly cold: boolean }
  | { readonly kind: 'rolled-back'; readonly restored: BlockId; readonly error: BlockSwitchError }
  | { readonly kind: 'superseded'; readonly byEpoch: number }
  | { readonly kind: 'noop' };

export interface ISessionLeaveGuard {
  confirmLeave(from: BlockId, to: BlockId): Promise<boolean>;
}

export class DefaultSessionLeaveGuard implements ISessionLeaveGuard {
  private activeGuard: ((from: BlockId, to: BlockId) => Promise<boolean>) | null = null;

  public registerGuard(guard: (from: BlockId, to: BlockId) => Promise<boolean>): () => void {
    this.activeGuard = guard;
    return () => {
      if (this.activeGuard === guard) {
        this.activeGuard = null;
      }
    };
  }

  public async confirmLeave(from: BlockId, to: BlockId): Promise<boolean> {
    if (this.activeGuard) {
      return this.activeGuard(from, to);
    }
    return true;
  }
}

export interface ISwitchBlockUseCase {
  execute(to: BlockId, reason?: BlockSwitchReason): Promise<BlockSwitchOutcome>;
  getCurrentEpoch(): number;
  getActiveBlockId(): BlockId;
}

export class SwitchBlockUseCase implements ISwitchBlockUseCase {
  private currentEpoch = 0;
  private inFlightController: AbortController | null = null;
  private internalActiveBlockId: BlockId;

  constructor(
    private catalog: IBlockCatalogReader,
    private preference: IActiveBlockPreference,
    private participants: IBlockHydrationParticipant[],
    private leaveGuard: ISessionLeaveGuard = new DefaultSessionLeaveGuard(),
    private getActiveBlock?: () => BlockId,
    private setActiveBlockState?: (state: {
      activeBlockId: BlockId;
      status: 'ready' | 'switching' | 'hydrating' | 'rolled-back';
      epoch: number;
    }) => void
  ) {
    this.internalActiveBlockId = (preference.read() as BlockId) || ('cvs' as BlockId);
  }

  public getCurrentEpoch(): number {
    return this.currentEpoch;
  }

  public getActiveBlockId(): BlockId {
    return this.getActiveBlock ? this.getActiveBlock() : this.internalActiveBlockId;
  }

  public async execute(
    to: BlockId,
    _reason: BlockSwitchReason = 'user-switcher'
  ): Promise<BlockSwitchOutcome> {
    const from = this.getActiveBlockId();

    if (from === to && this.currentEpoch > 0) {
      return { kind: 'noop' };
    }

    // 1. Validate block presence in catalog
    if (!this.catalog.has(to)) {
      return {
        kind: 'rolled-back',
        restored: from,
        error: { code: 'unknown-block', blockId: to },
      };
    }

    // 2. Session leave guard (US4)
    const canLeave = await this.leaveGuard.confirmLeave(from, to);
    if (!canLeave) {
      return {
        kind: 'rolled-back',
        restored: from,
        error: { code: 'cancelled-by-user' },
      };
    }

    // 3. Increment epoch and setup cancellation
    this.currentEpoch += 1;
    const epoch = this.currentEpoch;

    if (this.inFlightController) {
      this.inFlightController.abort();
    }
    this.inFlightController = new AbortController();
    const signal = this.inFlightController.signal;

    const startTime = performance.now();
    this.setActiveBlockState?.({
      activeBlockId: from,
      status: 'switching',
      epoch,
    });

    try {
      // 4. Phase 1: Prepare in parallel (zero visible side-effects)
      const preparedResults = new Map<string, unknown>();

      await Promise.all(
        this.participants.map(async (participant) => {
          const prepared = await participant.prepare(to, signal);
          preparedResults.set(participant.name, prepared);
        })
      );

      // Check if this run was superseded by a newer switch
      if (epoch !== this.currentEpoch || signal.aborted) {
        return { kind: 'superseded', byEpoch: this.currentEpoch };
      }

      // 5. Phase 2: Synchronous Atomic Commit
      this.setActiveBlockState?.({
        activeBlockId: to,
        status: 'hydrating',
        epoch,
      });

      for (const participant of this.participants) {
        const prepared = preparedResults.get(participant.name);
        participant.commit(prepared);
      }

      // 6. Persist preference & broadcast to other tabs
      this.preference.write(to);
      this.internalActiveBlockId = to;

      this.setActiveBlockState?.({
        activeBlockId: to,
        status: 'ready',
        epoch,
      });

      const durationMs = Math.round(performance.now() - startTime);

      return {
        kind: 'committed',
        to,
        durationMs,
        cold: false,
      };
    } catch (err: any) {
      // If superseded, don't rollback
      if (epoch !== this.currentEpoch) {
        return { kind: 'superseded', byEpoch: this.currentEpoch };
      }

      // Rollback to previous block
      this.setActiveBlockState?.({
        activeBlockId: from,
        status: 'rolled-back',
        epoch,
      });

      return {
        kind: 'rolled-back',
        restored: from,
        error: {
          code: 'hydration-failed',
          blockId: to,
          cause: err.message || 'Unknown hydration error',
        },
      };
    }
  }
}
