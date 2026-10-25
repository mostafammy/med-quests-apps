import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiMetricsCacheService } from '../aiMetricsCacheService.ts';
import { db } from '../../../storage/db.ts';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('AiMetricsCacheService (Two-Tier Telemetry Cache)', () => {
  let service: AiMetricsCacheService;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.spyOn(db.aiModelMetrics, 'bulkPut').mockResolvedValue('ok' as any);
    vi.spyOn(db.aiModelMetrics, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.aiModelMetrics, 'clear').mockResolvedValue(undefined as any);
    service = new AiMetricsCacheService();
  });

  it('records metrics synchronously into memory buffer and stages to localStorage', () => {
    const record = service.recordMetric({
      providerId: 'groq',
      modelId: 'llama-3.3-70b-versatile',
      latencyMs: 350,
      characterCount: 450,
      hadThinking: false,
      status: 'success',
      timestamp: Date.now(),
      questionId: 'q-cvs-001',
    });

    expect(record.id).toBeDefined();
    expect(record.latencyMs).toBe(350);
    expect(record.status).toBe('success');

    // Verify localStorage staging was called immediately
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('aggregates insights from recorded metrics', async () => {
    service.recordMetric({
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
      latencyMs: 650,
      characterCount: 800,
      hadThinking: true,
      status: 'success',
      timestamp: Date.now(),
      questionId: 'q-cvs-002',
    });

    service.recordMetric({
      providerId: 'groq',
      modelId: 'llama-3.3-70b-versatile',
      latencyMs: 250,
      characterCount: 500,
      hadThinking: false,
      status: 'success',
      timestamp: Date.now() + 10,
      questionId: 'q-cvs-003',
    });

    const insights = await service.getModelInsights();

    expect(insights.totalGenerations).toBe(2);
    expect(insights.fastestModel?.providerId).toBe('groq');
    expect(insights.fastestModel?.avgLatencyMs).toBe(250);
  });

  it('flushes metrics to IndexedDB', async () => {
    service.recordMetric({
      providerId: 'groq',
      modelId: 'llama-3.3-70b-versatile',
      latencyMs: 300,
      characterCount: 200,
      hadThinking: false,
      status: 'success',
      timestamp: Date.now(),
    });

    await service.flushToDatabase();
    expect(db.aiModelMetrics.bulkPut).toHaveBeenCalled();
  });

  it('clears all metrics from both cache tiers', async () => {
    service.recordMetric({
      providerId: 'openrouter',
      modelId: 'meta-llama/llama-3.1-8b-instruct:free',
      latencyMs: 400,
      characterCount: 300,
      hadThinking: false,
      status: 'success',
      timestamp: Date.now(),
    });

    await service.clearAllMetrics();

    const all = await service.getAllMetrics();
    expect(all).toHaveLength(0);
    expect(localStorageMock.removeItem).toHaveBeenCalled();
    expect(db.aiModelMetrics.clear).toHaveBeenCalled();
  });
});
