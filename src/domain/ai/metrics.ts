/**
 * AI Model Generation Telemetry & Performance Metrics
 * Domain models and analytics functions for tracking model latency, speed, and reliability.
 */
import { getModelDisplayName } from './modelCatalog.ts';
import type { CloudProviderId } from './settings.ts';

export interface AiModelMetricRecord {
  readonly id: string;
  readonly providerId: string; // 'groq' | 'gemini' | 'openrouter' | 'cached'
  readonly modelId: string;
  readonly latencyMs: number;
  readonly characterCount: number;
  readonly hadThinking: boolean;
  readonly status: 'success' | 'rate-limited' | 'error' | 'aborted';
  readonly timestamp: number;
  readonly questionId?: string | null;
}

export interface ModelPerformanceInsights {
  readonly modelId: string;
  readonly providerId: string;
  readonly displayName: string;
  readonly totalCalls: number;
  readonly successCalls: number;
  readonly successRate: number; // 0 to 1
  readonly avgLatencyMs: number;
  readonly minLatencyMs: number;
  readonly maxLatencyMs: number;
  readonly charsPerSecEstimate: number;
  readonly isFastest: boolean;
  readonly isMostReliable: boolean;
}

export interface OverallAiBenchmarkSummary {
  readonly totalGenerations: number;
  readonly overallAvgLatencyMs: number;
  readonly fastestModel: ModelPerformanceInsights | null;
  readonly mostReliableModel: ModelPerformanceInsights | null;
  readonly modelInsights: readonly ModelPerformanceInsights[];
}

/**
 * Formats milliseconds into human-readable generation time.
 * e.g. 142ms -> "142ms", 1250ms -> "1.3s"
 */
export function formatLatency(latencyMs: number | null | undefined): string {
  if (latencyMs === null || latencyMs === undefined || latencyMs < 0) return '0ms';
  if (latencyMs < 1000) return `${latencyMs}ms`;
  return `${(latencyMs / 1000).toFixed(1)}s`;
}

/**
 * Aggregates raw generation records into actionable performance benchmarks.
 */
export function computeModelInsights(records: readonly AiModelMetricRecord[]): OverallAiBenchmarkSummary {
  if (!records || records.length === 0) {
    return {
      totalGenerations: 0,
      overallAvgLatencyMs: 0,
      fastestModel: null,
      mostReliableModel: null,
      modelInsights: [],
    };
  }

  // Filter out zero-latency cached records for true hardware benchmarks
  const liveRecords = records.filter((r) => r.providerId !== 'cached' && r.latencyMs > 0);
  const targetRecords = liveRecords.length > 0 ? liveRecords : records;

  // Group by modelId
  const groups = new Map<string, AiModelMetricRecord[]>();
  let totalLatencySum = 0;

  for (const r of targetRecords) {
    totalLatencySum += r.latencyMs;
    const key = `${r.providerId}::${r.modelId}`;
    const list = groups.get(key) || [];
    list.push(r);
    groups.set(key, list);
  }

  const overallAvgLatencyMs = Math.round(totalLatencySum / targetRecords.length);

  const insightsList: ModelPerformanceInsights[] = [];

  for (const [key, groupRecords] of groups.entries()) {
    const [providerId, modelId] = key.split('::');
    const totalCalls = groupRecords.length;
    const successRecords = groupRecords.filter((r) => r.status === 'success');
    const successCalls = successRecords.length;
    const successRate = totalCalls > 0 ? successCalls / totalCalls : 1;

    // Measure latency & throughput on successful completions so instant error aborts don't skew speed
    const latencyRecords = successRecords.length > 0 ? successRecords : groupRecords;

    let latencySum = 0;
    let minLatencyMs = Number.MAX_SAFE_INTEGER;
    let maxLatencyMs = 0;
    let totalChars = 0;

    for (const r of latencyRecords) {
      latencySum += r.latencyMs;
      totalChars += r.characterCount;
      if (r.latencyMs < minLatencyMs) minLatencyMs = r.latencyMs;
      if (r.latencyMs > maxLatencyMs) maxLatencyMs = r.latencyMs;
    }

    const avgLatencyMs = Math.round(latencySum / latencyRecords.length);
    const totalSeconds = latencySum / 1000;
    const charsPerSecEstimate = totalSeconds > 0 ? Math.round(totalChars / totalSeconds) : 0;

    const displayName = getModelDisplayName(providerId as CloudProviderId, modelId);

    insightsList.push({
      modelId,
      providerId,
      displayName,
      totalCalls,
      successCalls,
      successRate,
      avgLatencyMs,
      minLatencyMs: minLatencyMs === Number.MAX_SAFE_INTEGER ? 0 : minLatencyMs,
      maxLatencyMs,
      charsPerSecEstimate,
      isFastest: false,
      isMostReliable: false,
    });
  }

  // Sort by average latency ascending (fastest first)
  insightsList.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);

  let fastestModel: ModelPerformanceInsights | null = null;
  let mostReliableModel: ModelPerformanceInsights | null = null;

  if (insightsList.length > 0) {
    // Fastest model with at least 1 success call
    const candidateFastest = insightsList.find((m) => m.successCalls > 0) || insightsList[0];
    // Most reliable: highest success rate with at least 1 call
    const candidateReliable = [...insightsList].sort((a, b) => b.successRate - a.successRate || a.avgLatencyMs - b.avgLatencyMs)[0];

    const decorated = insightsList.map((item) => ({
      ...item,
      isFastest: item.modelId === candidateFastest.modelId && item.providerId === candidateFastest.providerId,
      isMostReliable: item.modelId === candidateReliable.modelId && item.providerId === candidateReliable.providerId,
    }));

    fastestModel = decorated.find((m) => m.isFastest) || null;
    mostReliableModel = decorated.find((m) => m.isMostReliable) || null;

    return {
      totalGenerations: records.length,
      overallAvgLatencyMs,
      fastestModel,
      mostReliableModel,
      modelInsights: decorated,
    };
  }

  return {
    totalGenerations: records.length,
    overallAvgLatencyMs,
    fastestModel: null,
    mostReliableModel: null,
    modelInsights: [],
  };
}
