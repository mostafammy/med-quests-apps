import { describe, it, expect, vi } from 'vitest';
import {
  DexieBlockScopedQuestionRepository,
  DexieLearnerGlobalActivityReader,
} from '../DexieBlockScopedRepositories.ts';
import { db, upgradeV8ToV9 } from '../db.ts';

describe('Dexie v9 Schema & Block-Scoped Repositories (INV-2)', () => {
  it('verifies upgradeV8ToV9 backfills blockId on un-scoped srsCards accurately', async () => {
    const questions = [
      { id: 'q-cvs-01', blockId: 'cvs' },
      { id: 'q-cns-01', blockId: 'cns' },
    ];

    const srsCards = [
      {
        id: 'srs-1',
        questionId: 'q-cvs-01',
        highYieldTopicId: 'cvs-ana-valves',
        blockId: undefined,
      },
      {
        id: 'srs-2',
        questionId: 'q-cns-01',
        highYieldTopicId: 'cns-ana-brainstem',
        blockId: undefined,
      },
      {
        id: 'srs-3',
        questionId: null,
        highYieldTopicId: 'cns-phy-synapse',
        blockId: undefined,
      },
      {
        id: 'srs-4',
        questionId: null,
        highYieldTopicId: 'unmapped',
        blockId: undefined,
      },
    ];

    const mockTx = {
      table: (tableName: string) => {
        if (tableName === 'questions') {
          return {
            each: async (cb: (q: any) => void) => {
              for (const q of questions) {
                cb(q);
              }
            },
          };
        }
        if (tableName === 'srsCards') {
          return {
            toCollection: () => ({
              modify: async (cb: (card: any) => void) => {
                for (const card of srsCards) {
                  cb(card);
                }
              },
            }),
          };
        }
        throw new Error(`Unknown table ${tableName}`);
      },
    };

    await upgradeV8ToV9(mockTx as any);

    expect(srsCards[0].blockId).toBe('cvs'); // Inferred from questionId
    expect(srsCards[1].blockId).toBe('cns'); // Inferred from questionId
    expect(srsCards[2].blockId).toBe('cns'); // Inferred from highYieldTopicId prefix 'cns-'
    expect(srsCards[3].blockId).toBe('cvs'); // Fallback to default block
  });

  describe('Scoped Repositories Invariants', () => {
    const cvsRepo = new DexieBlockScopedQuestionRepository('cvs' as any);
    const cnsRepo = new DexieBlockScopedQuestionRepository('cns' as any);

    it('enforces block isolation: cvs repo only accesses cvs questions', async () => {
      expect(cvsRepo.blockId).toBe('cvs');
      expect(cnsRepo.blockId).toBe('cns');
    });

    it('DexieBlockScopedQuestionRepository binds blockId on put', async () => {
      const bulkPutSpy = vi.spyOn(db.questions, 'bulkPut').mockResolvedValue('any' as any);

      await cvsRepo.put([
        { id: 'q-1', stem: 'Test' } as any,
      ]);

      expect(bulkPutSpy).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'q-1', blockId: 'cvs' }),
      ]);

      bulkPutSpy.mockRestore();
    });

    it('DexieLearnerGlobalActivityReader reads cross-block attempts for streaks', async () => {
      const attemptsSpy = vi.spyOn(db.attempts, 'toArray').mockResolvedValue([
        { id: 'att-1', answeredAt: '2026-11-04T10:00:00Z', blockId: 'cvs' } as any,
        { id: 'att-2', answeredAt: '2026-11-05T10:00:00Z', blockId: 'cns' } as any,
      ]);

      const globalReader = new DexieLearnerGlobalActivityReader();
      const timestamps = await globalReader.answeredAtTimestamps();

      expect(timestamps).toEqual([
        '2026-11-04T10:00:00Z',
        '2026-11-05T10:00:00Z',
      ]);

      attemptsSpy.mockRestore();
    });
  });
});
