/**
 * Reactive Block Context Store (Zustand)
 * Exposes active block state, switcher action, and useActiveTaxonomy() hook.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import type { BlockId } from '../../domain/curriculum/ids.ts';
import type { BlockManifest } from '../../domain/curriculum/schemas.ts';
import type {
  BlockSwitchReason,
  BlockSwitchOutcome,
  BlockSwitchError,
} from '../curriculum/SwitchBlockUseCase.ts';
import { getCompositionRoot } from '../composition/clientCompositionRoot.ts';
import type { BlockPackDescriptor } from '../../domain/curriculum/BootBlockResolver.ts';
import { LegacyTaxonomyAdapter } from '../../domain/curriculum/LegacyTaxonomyAdapter.ts';
import type { Taxonomy } from '../../domain/model/types.ts';
import type { ViewerRole } from '../../domain/curriculum/BlockVisibilityPolicy.ts';
import { useAuthStore } from './useAuthStore.ts';
import { useLocaleStore } from './useLocaleStore.ts';

function safeGetCatalog() {
  try {
    const root = typeof getCompositionRoot === 'function' ? getCompositionRoot() : null;
    return root?.catalog || null;
  } catch {
    return null;
  }
}

function getViewerRole(): ViewerRole {
  try {
    const authState = useAuthStore.getState()?.authState;
    if (authState?.status === 'authenticated-active') {
      const role = authState.user.role;
      if (role === 'admin' || role === 'faculty-reviewer' || role === 'student-pro' || role === 'student-free') {
        return role;
      }
    }
  } catch {
    // SSR or uninitialized store
  }
  return 'student-free';
}

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
  visibleBlocks: [],

  init: async (deepLink: string | null = null) => {
    const root = getCompositionRoot();
    const catalog = root.catalog;
    const initialBlockId = root.resolveInitialBlock(deepLink);
    const role = getViewerRole();

    set({
      activeBlockId: initialBlockId,
      status: 'ready',
      visibleBlocks: catalog.list(role),
    });

    // Subscribe to cross-tab updates
    root.preference.subscribe((newBlockId) => {
      if (newBlockId !== get().activeBlockId) {
        get().switchBlock(newBlockId, 'cross-tab');
      }
    });

    // Subscribe to auth role changes to update visible blocks dynamically
    if (typeof window !== 'undefined') {
      useAuthStore.subscribe((authState) => {
        const nextRole = authState.authState.status === 'authenticated-active'
          ? (authState.authState.user.role as ViewerRole)
          : 'student-free';
        const updated = catalog.list(nextRole);
        const current = get().visibleBlocks;
        if (updated.length !== current.length || updated.some((b, i) => b.blockId !== current[i]?.blockId)) {
          set({ visibleBlocks: updated });
        }
      });
    }

    // Execute initial hydration for the resolved block
    await get().switchBlock(initialBlockId, 'boot');
  },

  switchBlock: async (to: BlockId, reason: BlockSwitchReason = 'user-switcher') => {
    set({ status: 'switching' });

    const root = getCompositionRoot();
    const outcome = await root.switchBlockUseCase.execute(to, reason);

    if (outcome.kind === 'committed') {
      set({
        activeBlockId: outcome.to,
        status: 'ready',
        epoch: root.switchBlockUseCase.getCurrentEpoch(),
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
    return useBlockContextStoreBase(selector as (state: BlockContextState) => U);
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
  const catalog = safeGetCatalog();
  const visibleBlocks = (rawVisible && rawVisible.length > 0)
    ? rawVisible
    : (catalog ? catalog.list(getViewerRole()) : []);
  const switchBlock = useBlockContextStoreBase.getState().switchBlock;

  const pack = catalog ? catalog.get(activeBlockId) : null;
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
  const isSsr = typeof window === 'undefined' || typeof document === 'undefined';
  const { manifest } = useActiveBlock();
  const locale = isSsr
    ? useLocaleStore.getState().locale
    : useLocaleStore((s) => s.locale);
  const catalog = safeGetCatalog();

  if (isSsr) {
    if (!manifest) {
      const cvsPack = catalog ? catalog.get('cvs' as BlockId) : null;
      if (cvsPack) {
        return LegacyTaxonomyAdapter.manifestToTaxonomy(cvsPack.manifest, locale);
      }
    }
    return LegacyTaxonomyAdapter.manifestToTaxonomy(manifest!, locale);
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMemo(() => {
    if (!manifest) {
      const cvsPack = catalog ? catalog.get('cvs' as BlockId) : null;
      if (cvsPack) {
        return LegacyTaxonomyAdapter.manifestToTaxonomy(cvsPack.manifest, locale);
      }
    }
    return LegacyTaxonomyAdapter.manifestToTaxonomy(manifest!, locale);
  }, [manifest, locale, catalog]);
}
