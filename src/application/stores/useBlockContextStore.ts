/**
 * Reactive Block Context Store (Zustand)
 * Exposes active block state, switcher action, and useActiveTaxonomy() hook.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { create } from 'zustand';
import type { BlockId } from '../../domain/curriculum/ids.ts';
import type { BlockManifest } from '../../domain/curriculum/schemas.ts';
import type {
  BlockSwitchReason,
  BlockSwitchOutcome,
  BlockSwitchError,
} from '../curriculum/SwitchBlockUseCase.ts';
import { compositionRoot } from '../composition/clientCompositionRoot.ts';
import type { BlockPackDescriptor } from '../../domain/curriculum/BootBlockResolver.ts';
import { LegacyTaxonomyAdapter } from '../../domain/curriculum/LegacyTaxonomyAdapter.ts';
import type { Taxonomy } from '../../domain/model/types.ts';
import { useLocaleStore } from './useLocaleStore.ts';

export type BlockContextStatus =
  | 'booting'
  | 'ready'
  | 'switching'
  | 'hydrating'
  | 'rolled-back'
  | 'error';

interface BlockContextState {
  activeBlockId: BlockId;
  status: BlockContextStatus;
  epoch: number;
  lastError: BlockSwitchError | null;
  visibleBlocks: readonly BlockPackDescriptor[];

  // Actions
  init: (deepLink?: string | null) => Promise<void>;
  switchBlock: (to: BlockId, reason?: BlockSwitchReason) => Promise<BlockSwitchOutcome>;
}

export const useBlockContextStoreBase = create<BlockContextState>((set, get) => ({
  activeBlockId: 'cvs' as BlockId,
  status: 'booting',
  epoch: 0,
  lastError: null,
  visibleBlocks: (typeof compositionRoot !== 'undefined' && compositionRoot?.catalog)
    ? compositionRoot.catalog.list('student-free')
    : [],

  init: async (deepLink: string | null = null) => {
    const catalog = compositionRoot.catalog;
    const initialBlockId = compositionRoot.resolveInitialBlock(deepLink);

    set({
      activeBlockId: initialBlockId,
      status: 'ready',
      visibleBlocks: catalog.list('student-free'),
    });

    // Subscribe to cross-tab updates
    compositionRoot.preference.subscribe((newBlockId) => {
      if (newBlockId !== get().activeBlockId) {
        get().switchBlock(newBlockId, 'cross-tab');
      }
    });

    // Execute initial hydration for the resolved block
    await get().switchBlock(initialBlockId, 'boot');
  },

  switchBlock: async (to: BlockId, reason: BlockSwitchReason = 'user-switcher') => {
    set({ status: 'switching' });

    const outcome = await compositionRoot.switchBlockUseCase.execute(to, reason);

    if (outcome.kind === 'committed') {
      set({
        activeBlockId: outcome.to,
        status: 'ready',
        epoch: compositionRoot.switchBlockUseCase.getCurrentEpoch(),
        lastError: null,
      });
    } else if (outcome.kind === 'rolled-back') {
      set({
        activeBlockId: outcome.restored,
        status: 'rolled-back',
        lastError: outcome.error,
      });
    }

    return outcome;
  },
}));

export const useBlockContextStore = Object.assign(
  function useBlockContextStore<U = BlockContextState>(
    selector?: (state: BlockContextState) => U
  ): U {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const state = useBlockContextStoreBase.getState();
      return selector ? selector(state) : (state as unknown as U);
    }
    return useBlockContextStoreBase(selector as any);
  },
  useBlockContextStoreBase
) as typeof useBlockContextStoreBase;

/**
 * Hook: Access the active block descriptor and manifest
 */
export function useActiveBlock() {
  const isSsr = typeof window === 'undefined' || typeof document === 'undefined';
  const activeBlockId = isSsr
    ? useBlockContextStoreBase.getState().activeBlockId
    : useBlockContextStore((s) => s.activeBlockId);
  const status = isSsr
    ? useBlockContextStoreBase.getState().status
    : useBlockContextStore((s) => s.status);
  const rawVisible = isSsr
    ? useBlockContextStoreBase.getState().visibleBlocks
    : useBlockContextStore((s) => s.visibleBlocks);
  const visibleBlocks = (rawVisible && rawVisible.length > 0)
    ? rawVisible
    : (typeof compositionRoot !== 'undefined' && compositionRoot?.catalog ? compositionRoot.catalog.list('student-free') : []);
  const switchBlock = useBlockContextStoreBase.getState().switchBlock;

  const pack = (typeof compositionRoot !== 'undefined' && compositionRoot?.catalog)
    ? compositionRoot.catalog.get(activeBlockId)
    : null;
  const manifest: BlockManifest | null = pack ? pack.manifest : null;

  return {
    activeBlockId,
    status,
    manifest,
    block: manifest?.block || null,
    switchBlock,
    visibleBlocks,
  };
}

/**
 * Hook: Access the active block's taxonomy mapped for UI views (Dashboard, TestHub, etc.)
 */
export function useActiveTaxonomy(): Taxonomy {
  const { manifest } = useActiveBlock();
  const locale = (typeof window === 'undefined' || typeof document === 'undefined')
    ? useLocaleStore.getState().locale
    : useLocaleStore((s) => s.locale);

  if (!manifest) {
    // Fallback if catalog not yet hydrated
    const cvsPack = (typeof compositionRoot !== 'undefined' && compositionRoot?.catalog)
      ? compositionRoot.catalog.get('cvs' as BlockId)
      : null;
    if (cvsPack) {
      return LegacyTaxonomyAdapter.manifestToTaxonomy(cvsPack.manifest, locale);
    }
  }

  return LegacyTaxonomyAdapter.manifestToTaxonomy(manifest!, locale);
}
