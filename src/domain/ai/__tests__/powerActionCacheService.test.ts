import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PowerActionCacheService } from '../powerActionCacheService.ts';
import { db } from '../../../infrastructure/storage/db.ts';

describe('PowerActionCacheService (0ms Local IndexedDB Persistence)', () => {
  let service: PowerActionCacheService;

  beforeEach(() => {
    service = new PowerActionCacheService();
    vi.clearAllMocks();
  });

  it('builds deterministic composite cache keys from questionId and actionKey', () => {
    const key = service.buildCacheKey('q-cvs-001', 'why_correct');
    expect(key).toBe('q-cvs-001:why_correct');

    const key2 = service.buildCacheKey('q-embryo-99', 'pv_loop');
    expect(key2).toBe('q-embryo-99:pv_loop');
  });

  it('safely handles empty or missing questionId without throwing', async () => {
    const cached = await service.getCachedAction('', 'why_correct');
    expect(cached).toBeNull();

    const keys = await service.getCachedActionKeys('');
    expect(keys.size).toBe(0);

    // Should return cleanly without throwing
    await expect(service.clearQuestionCache('')).resolves.not.toThrow();
  });

  it('persists and retrieves cached power action records', async () => {
    const mockPut = vi.spyOn(db.aiCache, 'put').mockResolvedValue('q-cvs-001:why_correct' as any);
    const mockGet = vi.spyOn(db.aiCache, 'get').mockResolvedValue({
      cacheKey: 'q-cvs-001:why_correct',
      questionId: 'q-cvs-001',
      actionKey: 'why_correct',
      prompt: 'Explain why Option C is correct',
      responseParts: [{ kind: 'text', text: 'Option C is correct because of...' }],
      engine: 'groq',
      cachedAt: '2026-10-25T00:00:00.000Z',
    });

    await service.saveCachedAction(
      'q-cvs-001',
      'why_correct',
      'Explain why Option C is correct',
      [{ kind: 'text', text: 'Option C is correct because of...' }],
      'groq'
    );

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: 'q-cvs-001:why_correct',
        questionId: 'q-cvs-001',
        actionKey: 'why_correct',
        engine: 'groq',
      })
    );

    const record = await service.getCachedAction('q-cvs-001', 'why_correct');
    expect(mockGet).toHaveBeenCalledWith('q-cvs-001:why_correct');
    expect(record).not.toBeNull();
    expect(record?.cacheKey).toBe('q-cvs-001:why_correct');
    expect(record?.responseParts[0]).toEqual({
      kind: 'text',
      text: 'Option C is correct because of...',
    });
  });

  it('deletes all cached actions for a question when clearQuestionCache is called', async () => {
    const mockDelete = vi.fn().mockResolvedValue(2);
    vi.spyOn(db.aiCache, 'where').mockReturnValue({
      equals: () => ({
        delete: mockDelete,
      }),
    } as any);

    await service.clearQuestionCache('q-cvs-001');
    expect(mockDelete).toHaveBeenCalled();
  });
});
