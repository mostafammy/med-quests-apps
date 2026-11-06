/// <reference types="vite/client" />

/**
 * Vite Block Pack Source
 * Loads block manifests eagerly and code-splits question banks lazily via dynamic import chunks.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockId } from '../../domain/curriculum/ids.ts';
import type { IBlockPackSource } from './InMemoryBlockPackSource.ts';

export class ViteBlockPackSource implements IBlockPackSource {
  private manifestModules: Record<string, unknown>;
  private bankLoaders: Record<string, () => Promise<unknown>>;

  constructor() {
    // Eagerly load all manifest JSONs (≤ 8 KB gz total across blocks)
    this.manifestModules = import.meta.glob('../../../content/*/manifest.json', {
      eager: true,
      import: 'default',
    });

    // Lazily import question banks on-demand per active block
    this.bankLoaders = import.meta.glob('../../../content/*/dist/bank.v1.json', {
      eager: false,
      import: 'default',
    });
  }

  public listManifests(): readonly unknown[] {
    return Object.values(this.manifestModules);
  }

  public async loadBank(blockId: BlockId, signal?: AbortSignal): Promise<readonly unknown[]> {
    if (signal?.aborted) {
      throw new DOMException(`Aborted loading question bank for block '${blockId}'`, 'AbortError');
    }

    // Match loader path for the specific blockId
    const targetSuffix = `/content/${blockId}/dist/bank.v1.json`;
    const matchedKey = Object.keys(this.bankLoaders).find((k) =>
      k.endsWith(targetSuffix) || k.includes(`content/${blockId}/dist/bank.v1.json`)
    );

    if (!matchedKey || !this.bankLoaders[matchedKey]) {
      console.warn(`[ViteBlockPackSource] No bundled bank found for block '${blockId}', returning empty bank.`);
      return [];
    }

    const loadPromise = this.bankLoaders[matchedKey]();

    if (!signal) {
      const data = await loadPromise;
      return Array.isArray(data) ? data : [];
    }

    // Wrap with AbortSignal cancellation
    return new Promise<readonly unknown[]>((resolve, reject) => {
      const onAbort = () => {
        reject(new DOMException(`Aborted loading question bank for block '${blockId}'`, 'AbortError'));
      };

      signal.addEventListener('abort', onAbort, { once: true });

      loadPromise
        .then((data) => {
          signal.removeEventListener('abort', onAbort);
          resolve(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        });
    });
  }
}

export const defaultViteBlockPackSource = new ViteBlockPackSource();
