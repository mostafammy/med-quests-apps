/**
 * Power Action Cache Service
 * Persists and retrieves high-frequency AI responses in local IndexedDB (db.aiCache).
 * Provides sub-millisecond (0ms) instantaneous response retrieval and offline availability.
 * Namespaces cache keys by resolved language ('en' | 'ar') to guarantee linguistic fidelity.
 */
import { db, type AiPowerActionCacheRecord } from '../../infrastructure/storage/db.ts';
import type { MessagePart } from './conversation.ts';
import type { ResolvedChatLanguage } from '../i18n/types.ts';

export class PowerActionCacheService {
  buildCacheKey(
    questionId: string,
    actionKey: string,
    lang: ResolvedChatLanguage = 'en'
  ): string {
    return `${questionId}:${actionKey}:${lang}`;
  }

  async getCachedAction(
    questionId: string,
    actionKey: string,
    lang: ResolvedChatLanguage = 'en'
  ): Promise<AiPowerActionCacheRecord | null> {
    if (!questionId) return null;
    try {
      const key = this.buildCacheKey(questionId, actionKey, lang);
      const record = await db.aiCache.get(key);
      if (record) return record;

      // Backward-compatibility fallback for legacy un-namespaced keys (which were English)
      if (lang === 'en') {
        const legacyKey = `${questionId}:${actionKey}`;
        const legacyRecord = await db.aiCache.get(legacyKey);
        return legacyRecord ?? null;
      }

      return null;
    } catch {
      return null;
    }
  }

  async saveCachedAction(
    questionId: string,
    actionKey: string,
    prompt: string,
    responseParts: MessagePart[],
    engine: string | null,
    lang: ResolvedChatLanguage = 'en'
  ): Promise<void> {
    if (!questionId || responseParts.length === 0) return;
    try {
      const cacheKey = this.buildCacheKey(questionId, actionKey, lang);
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

  async getCachedActionKeys(
    questionId: string,
    lang: ResolvedChatLanguage = 'en'
  ): Promise<Set<string>> {
    if (!questionId) return new Set();
    try {
      const records = await db.aiCache.where('questionId').equals(questionId).toArray();
      const keys = new Set<string>();

      for (const r of records) {
        if (r.cacheKey.endsWith(`:${lang}`)) {
          keys.add(r.actionKey);
        } else if (lang === 'en' && !r.cacheKey.includes(':ar')) {
          // Legacy keys without language tag treated as English
          keys.add(r.actionKey);
        }
      }

      return keys;
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
