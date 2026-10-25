import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PowerActionCacheService } from '../powerActionCacheService.ts';
import { db } from '../../../infrastructure/storage/db.ts';

describe('PowerActionCacheService (0ms Local IndexedDB Persistence)', () => {
  let service: PowerActionCacheService;

  beforeEach(() => {
    service = new PowerActionCacheService();
    vi.clearAllMocks();
  });

  it('builds deterministic composite cache keys with language namespace', () => {
    const keyEn = service.buildCacheKey('q-cvs-001', 'why_correct', 'en');
    expect(keyEn).toBe('q-cvs-001:why_correct:en');

    const keyAr = service.buildCacheKey('q-cvs-001', 'why_correct', 'ar');
    expect(keyAr).toBe('q-cvs-001:why_correct:ar');

    const keyDefault = service.buildCacheKey('q-embryo-99', 'pv_loop');
    expect(keyDefault).toBe('q-embryo-99:pv_loop:en');
  });

  it('safely handles empty or missing questionId without throwing', async () => {
    const cached = await service.getCachedAction('', 'why_correct');
    expect(cached).toBeNull();

    const keys = await service.getCachedActionKeys('');
    expect(keys.size).toBe(0);

    // Should return cleanly without throwing
    await expect(service.clearQuestionCache('')).resolves.not.toThrow();
  });

  it('persists and retrieves cached power action records with language namespacing', async () => {
    const mockPut = vi.spyOn(db.aiCache, 'put').mockResolvedValue('q-cvs-001:why_correct:en' as any);
    const mockGet = vi.spyOn(db.aiCache, 'get').mockResolvedValue({
      cacheKey: 'q-cvs-001:why_correct:en',
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
      'groq',
      'en'
    );

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: 'q-cvs-001:why_correct:en',
        questionId: 'q-cvs-001',
        actionKey: 'why_correct',
        engine: 'groq',
      })
    );

    const retrieved = await service.getCachedAction('q-cvs-001', 'why_correct', 'en');
    expect(mockGet).toHaveBeenCalledWith('q-cvs-001:why_correct:en');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.actionKey).toBe('why_correct');
  });

  it('supports legacy cache keys without language suffix for English queries', async () => {
    vi.spyOn(db.aiCache, 'get')
      .mockResolvedValueOnce(undefined as any) // first call with :en misses
      .mockResolvedValueOnce({
        cacheKey: 'q-cvs-002:pivot_clues',
        questionId: 'q-cvs-002',
        actionKey: 'pivot_clues',
        prompt: 'Pivot clues prompt',
        responseParts: [{ kind: 'text', text: 'Legacy cached text' }],
        engine: 'gemini',
        cachedAt: '2026-10-24T00:00:00.000Z',
      } as any);

    const cached = await service.getCachedAction('q-cvs-002', 'pivot_clues', 'en');
    expect(cached).not.toBeNull();
    expect(cached?.responseParts[0]).toEqual({ kind: 'text', text: 'Legacy cached text' });
  });

  it('clears all cached actions for a question', async () => {
    const mockWhere = vi.spyOn(db.aiCache, 'where').mockReturnValue({
      equals: vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue(3),
      }),
    } as any);

    await service.clearQuestionCache('q-cvs-001');
    expect(mockWhere).toHaveBeenCalledWith('questionId');
  });
});
