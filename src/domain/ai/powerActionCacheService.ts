/**
 * Power Action Cache Service
 * Persists and retrieves high-frequency AI responses in local IndexedDB (db.aiCache).
 * Provides sub-millisecond (0ms) instantaneous response retrieval and offline availability.
 */
import { db, type AiPowerActionCacheRecord } from '../../infrastructure/storage/db.ts';
import type { MessagePart } from './conversation.ts';

export class PowerActionCacheService {
  buildCacheKey(questionId: string, actionKey: string): string {
    return `${questionId}:${actionKey}`;
  }

  async getCachedAction(
    questionId: string,
    actionKey: string
  ): Promise<AiPowerActionCacheRecord | null> {
    if (!questionId) return null;
    try {
      const key = this.buildCacheKey(questionId, actionKey);
      const record = await db.aiCache.get(key);
      return record ?? null;
    } catch {
      return null;
    }
  }

  async saveCachedAction(
    questionId: string,
    actionKey: string,
    prompt: string,
    responseParts: MessagePart[],
    engine: string | null
  ): Promise<void> {
    if (!questionId || responseParts.length === 0) return;
    try {
      const cacheKey = this.buildCacheKey(questionId, actionKey);
      await db.aiCache.put({
        cacheKey,
        questionId,
        actionKey,
        prompt,
        responseParts,
        engine,
        cachedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to cache AI power action in IndexedDB:', err);
    }
  }

  async getCachedActionKeys(questionId: string): Promise<Set<string>> {
    if (!questionId) return new Set();
    try {
      const records = await db.aiCache.where('questionId').equals(questionId).toArray();
      return new Set(records.map((r) => r.actionKey));
    } catch {
      return new Set();
    }
  }

  async clearQuestionCache(questionId: string): Promise<void> {
    if (!questionId) return;
    try {
      await db.aiCache.where('questionId').equals(questionId).delete();
    } catch (err) {
      console.warn('Failed to clear question cache:', err);
    }
  }
}

export const powerActionCacheService = new PowerActionCacheService();
