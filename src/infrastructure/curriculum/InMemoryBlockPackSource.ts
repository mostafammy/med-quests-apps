/**
 * In-Memory Block Pack Source
 * Deterministic test double for unit and property testing
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import type { BlockId } from '../../domain/curriculum/ids.ts';
import type { BlockManifest } from '../../domain/curriculum/schemas.ts';

export interface InMemoryPackFixture {
  readonly manifest: BlockManifest;
  readonly bank: readonly unknown[];
  readonly contentHash?: string;
}

export interface IBlockPackSource {
  listManifests(): readonly unknown[];
  loadBank(blockId: BlockId, signal?: AbortSignal): Promise<readonly unknown[]>;
}

export class InMemoryBlockPackSource implements IBlockPackSource {
  private packs: Map<string, InMemoryPackFixture> = new Map();

  constructor(initialFixtures: readonly InMemoryPackFixture[] = []) {
    for (const fixture of initialFixtures) {
      this.packs.set(fixture.manifest.block.id, fixture);
    }
  }

  public registerFixture(fixture: InMemoryPackFixture): void {
    this.packs.set(fixture.manifest.block.id, fixture);
  }

  public listManifests(): readonly unknown[] {
    return Array.from(this.packs.values()).map((p) => p.manifest);
  }

  public async loadBank(blockId: BlockId, signal?: AbortSignal): Promise<readonly unknown[]> {
    if (signal?.aborted) {
      throw new Error(`Load bank aborted for block '${blockId}'`);
    }

    const pack = this.packs.get(blockId);
    if (!pack) {
      throw new Error(`Block pack not found in memory: '${blockId}'`);
    }

    return pack.bank;
  }
}
