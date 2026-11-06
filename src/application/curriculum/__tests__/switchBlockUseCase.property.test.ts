/**
 * Property-based and fault-injection tests for SwitchBlockUseCase
 * Proves INV-1 (Isolation), INV-3 (Atomicity/Rollback), INV-4 (Race Convergence).
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { SwitchBlockUseCase } from '../SwitchBlockUseCase.ts';
import { BlockCatalog } from '../../../domain/curriculum/BlockCatalog.ts';
import type { BlockId } from '../../../domain/curriculum/ids.ts';
import type { IBlockHydrationParticipant } from '../hydrationParticipants.ts';
import type { IActiveBlockPreference } from '../../../infrastructure/curriculum/LocalStorageActiveBlockPreference.ts';
import type { BlockPackDescriptor } from '../../../domain/curriculum/BootBlockResolver.ts';

function createMockDescriptor(id: string, name: string): BlockPackDescriptor {
  return {
    blockId: id as BlockId,
    manifest: {
      schemaVersion: 1,
      block: {
        id: id as BlockId,
        code: `Block ${id.toUpperCase()}`,
        name: { en: name, ar: name },
        shortName: id.toUpperCase(),
        description: { en: `${name} description`, ar: `${name} description` },
        status: 'published',
        catalogOrder: 1,
        presentation: { glyph: 'heart', accent: 'rose' },
        aiProfileId: `${id}-profile`,
      },
      subjects: [{ id: 'sub-1' as any, name: { en: 'S1', ar: 'S1' }, order: 1 }],
      chapters: [{ id: `${id}-ch-1`, subjectId: 'sub-1' as any, name: { en: 'C1', ar: 'C1' }, order: 1, sourceIds: [] }],
      topics: [{ id: `${id}-ch-1/t-1`, chapterId: `${id}-ch-1`, name: { en: 'T1', ar: 'T1' }, order: 1 }],
      sources: [],
    },
    contentHash: `hash-${id}`,
  };
}

class InMemoryPreference implements IActiveBlockPreference {
  public current: BlockId = 'cvs' as BlockId;
  read(): BlockId | null {
    return this.current;
  }
  write(blockId: BlockId): void {
    this.current = blockId;
  }
  subscribe(_listener: (blockId: BlockId) => void): () => void {
    return () => {};
  }
}

describe('SPEC-010: SwitchBlockUseCase Property & Invariant Tests', () => {
  let catalog: BlockCatalog;
  let preference: InMemoryPreference;
  let activeState: { activeBlockId: BlockId; status: string; epoch: number };

  beforeEach(() => {
    catalog = new BlockCatalog([
      createMockDescriptor('cvs', 'Cardiovascular System'),
      createMockDescriptor('cns', 'Central Nervous System'),
      createMockDescriptor('rrs', 'Respiratory System'),
    ]);
    preference = new InMemoryPreference();
    activeState = { activeBlockId: 'cvs' as BlockId, status: 'ready', epoch: 0 };
  });

  // ==========================================================================
  // INV-3: Rollback Atomicity Under Injected Faults
  // ==========================================================================
  it('INV-3: Atomicity - rolled-back state restores initial block if any participant prepare throws', async () => {
    const failingParticipant: IBlockHydrationParticipant = {
      name: 'questions',
      async prepare(blockId: BlockId) {
        if (blockId === 'cns') {
          throw new Error('Network timeout downloading chunk');
        }
        return { blockId };
      },
      commit() {},
    };

    const healthyParticipant: IBlockHydrationParticipant = {
      name: 'stats',
      async prepare(blockId: BlockId) {
        return { statsFor: blockId };
      },
      commit() {},
    };

    const useCase = new SwitchBlockUseCase(
      catalog,
      preference,
      [healthyParticipant, failingParticipant],
      undefined,
      () => activeState.activeBlockId,
      (s) => {
        activeState = { ...activeState, ...s };
      }
    );

    const outcome = await useCase.execute('cns' as BlockId);

    expect(outcome.kind).toBe('rolled-back');
    if (outcome.kind === 'rolled-back') {
      expect(outcome.restored).toBe('cvs');
      expect(outcome.error.code).toBe('hydration-failed');
    }
    // Active block must remain unchanged
    expect(activeState.activeBlockId).toBe('cvs');
    expect(activeState.status).toBe('rolled-back');
    // Preference in storage must not have been corrupted
    expect(preference.read()).toBe('cvs');
  });

  // ==========================================================================
  // INV-4: Race Safety & Convergence across Rapid Concurrent Switches
  // ==========================================================================
  it('INV-4: Race Safety - 10 rapid concurrent switches converge deterministically to the last epoch', async () => {
    let committedBlocks: BlockId[] = [];

    const slowParticipant: IBlockHydrationParticipant = {
      name: 'questions',
      async prepare(blockId: BlockId, signal: AbortSignal) {
        // Variable jitter delay 5ms - 25ms
        const delay = Math.floor(Math.random() * 20) + 5;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
        return { blockId };
      },
      commit(prepared: unknown) {
        const { blockId } = prepared as { blockId: BlockId };
        committedBlocks.push(blockId);
      },
    };

    const useCase = new SwitchBlockUseCase(
      catalog,
      preference,
      [slowParticipant],
      undefined,
      () => activeState.activeBlockId,
      (s) => {
        activeState = { ...activeState, ...s };
      }
    );

    // Fire 10 switches in rapid succession
    const targets: BlockId[] = [
      'cns', 'cvs', 'rrs', 'cns', 'cvs',
      'rrs', 'cvs', 'cns', 'rrs', 'cns'
    ].map((s) => s as BlockId);

    const results = await Promise.all(
      targets.map((target) => useCase.execute(target))
    );

    // The final switch was 'cns'
    const finalOutcome = results[results.length - 1];
    expect(finalOutcome.kind).toBe('committed');
    if (finalOutcome.kind === 'committed') {
      expect(finalOutcome.to).toBe('cns');
    }

    // Active state must be 'cns' and status 'ready'
    expect(activeState.activeBlockId).toBe('cns');
    expect(activeState.status).toBe('ready');
    expect(preference.read()).toBe('cns');
    // The last committed block in participant must be 'cns'
    expect(committedBlocks[committedBlocks.length - 1]).toBe('cns');
  });

  // ==========================================================================
  // INV-1: Isolation & Property Testing with fast-check
  // ==========================================================================
  it('INV-1: Isolation Property - for any valid switch sequence, stores never interleave blocks', async () => {
    const validBlockIds: BlockId[] = ['cvs', 'cns', 'rrs'].map((s) => s as BlockId);

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom(...validBlockIds), { minLength: 1, maxLength: 8 }),
        async (sequence) => {
          let lastCommitted: BlockId = 'cvs' as BlockId;

          const participant: IBlockHydrationParticipant = {
            name: 'questions',
            async prepare(blockId: BlockId) {
              return { blockId };
            },
            commit(prepared: unknown) {
              lastCommitted = (prepared as { blockId: BlockId }).blockId;
            },
          };

          const p = new InMemoryPreference();
          let s = { activeBlockId: 'cvs' as BlockId, status: 'ready', epoch: 0 };

          const u = new SwitchBlockUseCase(
            catalog,
            p,
            [participant],
            undefined,
            () => s.activeBlockId,
            (st) => {
              s = { ...s, ...st };
            }
          );

          for (const target of sequence) {
            const out = await u.execute(target);
            if (out.kind === 'committed') {
              expect(s.activeBlockId).toBe(target);
              expect(lastCommitted).toBe(target);
              expect(p.read()).toBe(target);
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});
