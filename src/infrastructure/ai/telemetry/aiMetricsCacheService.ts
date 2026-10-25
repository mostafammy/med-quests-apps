/**
 * AI Metrics Two-Tier Telemetry Cache & Storage Service
 *
 * Implements a 2-tier architecture:
 * Tier 1: Zero-latency synchronous in-memory buffer + localStorage staging cache.
 * Tier 2: Non-blocking asynchronous IndexedDB persistence (db.aiModelMetrics).
 *
 * This guarantees zero UI latency penalty on completion while persisting full
 * historical benchmarks for model speed, reliability, and token efficiency analysis.
 */
import { db } from '../../storage/db.ts';
import {
  type AiModelMetricRecord,
  type OverallAiBenchmarkSummary,
  computeModelInsights,
} from '../../../domain/ai/metrics.ts';

const CACHE_STORAGE_KEY = 'medquests_ai_metrics_cache_v1';
const FLUSH_DEBOUNCE_MS = 1500;
const MAX_LOCAL_CACHE_ITEMS = 100;

function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

export class AiMetricsCacheService {
  private inMemoryCache: AiModelMetricRecord[] = [];
  private flushTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;

  constructor() {
    this.hydrateFromLocalStorage();
  }

  /**
   * Hydrates initial in-memory cache buffer from fast localStorage staging.
   */
  private hydrateFromLocalStorage(): void {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AiModelMetricRecord[];
        if (Array.isArray(parsed)) {
          this.inMemoryCache = parsed;
        }
      }
    } catch (e) {
      console.warn('[AiMetricsCacheService] Failed to load cached metrics from localStorage', e);
    }
  }

  /**
   * Persists current in-memory cache buffer to localStorage.
   */
  private persistToLocalStorage(): void {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
      const trimmed = this.inMemoryCache.slice(-MAX_LOCAL_CACHE_ITEMS);
      storage.setItem(CACHE_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[AiMetricsCacheService] Failed to save cached metrics to localStorage', e);
    }
  }

  /**
   * Synchronously records a generation metric into Tier 1 (Memory + LocalStorage).
   * Automatically schedules an asynchronous background flush to IndexedDB.
   */
  public recordMetric(metric: Omit<AiModelMetricRecord, 'id'>): AiModelMetricRecord {
    const fullRecord: AiModelMetricRecord = {
      ...metric,
      id: `metric-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };

    // 1. Instant insertion into in-memory cache buffer
    this.inMemoryCache.push(fullRecord);

    // 2. Immediate synchronous localStorage staging (fail-safe against page unload)
    this.persistToLocalStorage();

    // 3. Schedule non-blocking background flush to IndexedDB (Tier 2)
    this.scheduleBackgroundFlush();

    return fullRecord;
  }

  /**
   * Schedules a debounced background flush to IndexedDB.
   */
  private scheduleBackgroundFlush(): void {
    if (this.flushTimeoutId !== null) {
      clearTimeout(this.flushTimeoutId);
    }

    this.flushTimeoutId = setTimeout(() => {
      this.flushTimeoutId = null;
      void this.flushToDatabase();
    }, FLUSH_DEBOUNCE_MS);
  }

  /**
   * Flushes all staged metrics from memory/localStorage to IndexedDB.
   */
  public async flushToDatabase(): Promise<void> {
    if (this.isFlushing || this.inMemoryCache.length === 0) return;
    this.isFlushing = true;

    const toPersist = [...this.inMemoryCache];

    try {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        await new Promise<void>((resolve) => {
          (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(async () => {
            try {
              await db.aiModelMetrics.bulkPut(toPersist);
              resolve();
            } catch (err) {
              console.warn('[AiMetricsCacheService] bulkPut to db.aiModelMetrics failed', err);
              resolve();
            }
          });
        });
      } else {
        await db.aiModelMetrics.bulkPut(toPersist);
      }

      // Evict persisted items from pending in-memory buffer
      const persistedIds = new Set(toPersist.map((r) => r.id));
      this.inMemoryCache = this.inMemoryCache.filter((r) => !persistedIds.has(r.id));
      this.persistToLocalStorage();
    } catch (err) {
      console.warn('[AiMetricsCacheService] Error flushing metrics to IndexedDB', err);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Retrieves all metric records combining IndexedDB historical data + pending Tier 1 cache.
   */
  public async getAllMetrics(): Promise<AiModelMetricRecord[]> {
    let dbRecords: AiModelMetricRecord[] = [];
    try {
      dbRecords = await db.aiModelMetrics.toArray();
    } catch (e) {
      console.warn('[AiMetricsCacheService] Failed to read from db.aiModelMetrics', e);
    }

    // Merge DB records with any staged records in memory (deduplicating by id)
    const recordMap = new Map<string, AiModelMetricRecord>();
    for (const r of dbRecords) {
      recordMap.set(r.id, r);
    }
    for (const r of this.inMemoryCache) {
      recordMap.set(r.id, r);
    }

    const merged = Array.from(recordMap.values());
    merged.sort((a, b) => b.timestamp - a.timestamp);
    return merged;
  }

  /**
   * Computes comprehensive model performance insights across all recorded generations.
   */
  public async getModelInsights(): Promise<OverallAiBenchmarkSummary> {
    const allRecords = await this.getAllMetrics();
    return computeModelInsights(allRecords);
  }

  /**
   * Clears both cache tiers (memory, localStorage, and IndexedDB).
   */
  public async clearAllMetrics(): Promise<void> {
    this.inMemoryCache = [];
    if (this.flushTimeoutId !== null) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.removeItem(CACHE_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    try {
      await db.aiModelMetrics.clear();
    } catch (err) {
      console.warn('[AiMetricsCacheService] Failed to clear db.aiModelMetrics', err);
    }
  }
}

export const aiMetricsCacheService = new AiMetricsCacheService();
