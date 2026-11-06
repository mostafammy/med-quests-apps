/**
 * Boot Block Resolution Engine (FR-011)
 * Evaluates initial active block precedence cleanly and deterministically.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { BlockId, LEGACY_DEFAULT_BLOCK_ID } from './ids.ts';
import type { BlockManifest } from './schemas.ts';

export type BlockSwitchReason =
  | 'user-switcher'
  | 'deep-link'
  | 'cross-tab'
  | 'boot'
  | 'fallback-unavailable';

export interface BlockPackDescriptor {
  readonly blockId: BlockId;
  readonly manifest: BlockManifest;
  readonly contentHash: string;
}

export interface BootResolveInput {
  readonly deepLink: string | null;
  readonly persisted: string | null;
  readonly visible: readonly BlockPackDescriptor[];
}

export interface BootResolveResult {
  readonly blockId: BlockId;
  readonly reason: BlockSwitchReason;
  readonly notice: 'none' | 'deep-link-invalid' | 'persisted-unavailable';
}

export interface IBootBlockResolver {
  resolve(input: BootResolveInput): BootResolveResult;
}

export class BootBlockResolver implements IBootBlockResolver {
  public resolve(input: {
    readonly deepLink: string | null;
    readonly persisted: string | null;
    readonly visible: readonly BlockPackDescriptor[];
  }): BootResolveResult {
    const visibleMap = new Map<string, BlockPackDescriptor>();
    for (const desc of input.visible) {
      visibleMap.set(desc.blockId, desc);
    }

    // 1. Check deep-link query param (?block=...)
    if (input.deepLink) {
      const match = visibleMap.get(input.deepLink);
      if (match) {
        return {
          blockId: match.blockId,
          reason: 'deep-link',
          notice: 'none',
        };
      }
    }

    // Notice if deep link was attempted but invalid
    const deepLinkNotice = input.deepLink ? 'deep-link-invalid' : 'none';

    // 2. Check persisted preference
    if (input.persisted) {
      const match = visibleMap.get(input.persisted);
      if (match) {
        return {
          blockId: match.blockId,
          reason: 'boot',
          notice: deepLinkNotice,
        };
      }
    }

    const persistedNotice = input.persisted && deepLinkNotice === 'none' ? 'persisted-unavailable' : deepLinkNotice;

    // 3. First published block sorted by catalogOrder
    const published = input.visible
      .filter((d) => d.manifest.block.status === 'published')
      .sort((a, b) => a.manifest.block.catalogOrder - b.manifest.block.catalogOrder);

    if (published.length > 0) {
      return {
        blockId: published[0].blockId,
        reason: 'boot',
        notice: persistedNotice,
      };
    }

    // 4. Any visible block
    if (input.visible.length > 0) {
      return {
        blockId: input.visible[0].blockId,
        reason: 'boot',
        notice: persistedNotice,
      };
    }

    // 5. Ultimate fallback
    return {
      blockId: LEGACY_DEFAULT_BLOCK_ID,
      reason: 'fallback-unavailable',
      notice: persistedNotice,
    };
  }
}

export const defaultBootBlockResolver = new BootBlockResolver();
