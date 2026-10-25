import { describe, it, expect } from 'vitest';
import {
  type AiModelMetricRecord,
  formatLatency,
  computeModelInsights,
} from '../metrics.ts';

describe('AI Generation Metrics & Latency Telemetry', () => {
  describe('formatLatency', () => {
    it('formats millisecond durations correctly', () => {
      expect(formatLatency(null)).toBe('0ms');
      expect(formatLatency(undefined)).toBe('0ms');
      expect(formatLatency(-10)).toBe('0ms');
      expect(formatLatency(0)).toBe('0ms');
      expect(formatLatency(85)).toBe('85ms');
      expect(formatLatency(999)).toBe('999ms');
      expect(formatLatency(1000)).toBe('1.0s');
      expect(formatLatency(1240)).toBe('1.2s');
      expect(formatLatency(3560)).toBe('3.6s');
    });
  });

  describe('computeModelInsights', () => {
    it('handles empty records cleanly', () => {
      const summary = computeModelInsights([]);
      expect(summary.totalGenerations).toBe(0);
      expect(summary.overallAvgLatencyMs).toBe(0);
      expect(summary.fastestModel).toBeNull();
      expect(summary.mostReliableModel).toBeNull();
      expect(summary.modelInsights).toHaveLength(0);
    });

    it('ranks models by latency and determines fastest and most reliable models', () => {
      const sampleRecords: AiModelMetricRecord[] = [
        // Groq llama-3.3-70b-versatile (Fast: ~400ms, 100% success)
        {
          id: '1',
          providerId: 'groq',
          modelId: 'llama-3.3-70b-versatile',
          latencyMs: 380,
          characterCount: 600,
          hadThinking: false,
          status: 'success',
          timestamp: 1000,
        },
        {
          id: '2',
          providerId: 'groq',
          modelId: 'llama-3.3-70b-versatile',
          latencyMs: 420,
          characterCount: 700,
          hadThinking: false,
          status: 'success',
          timestamp: 2000,
        },

        // Gemini 2.5 Pro (Slower: ~1800ms, 100% success)
        {
          id: '3',
          providerId: 'gemini',
          modelId: 'gemini-2.5-pro',
          latencyMs: 1800,
          characterCount: 1500,
          hadThinking: true,
          status: 'success',
          timestamp: 3000,
        },

        // OpenRouter (Fast but 1 rate limit: 50% success)
        {
          id: '4',
          providerId: 'openrouter',
          modelId: 'meta-llama/llama-3.1-8b-instruct:free',
          latencyMs: 500,
          characterCount: 400,
          hadThinking: false,
          status: 'success',
          timestamp: 4000,
        },
        {
          id: '5',
          providerId: 'openrouter',
          modelId: 'meta-llama/llama-3.1-8b-instruct:free',
          latencyMs: 200,
          characterCount: 0,
          hadThinking: false,
          status: 'rate-limited',
          timestamp: 5000,
        },
      ];

      const insights = computeModelInsights(sampleRecords);

      expect(insights.totalGenerations).toBe(5);
      expect(insights.modelInsights).toHaveLength(3);

      // Groq has avg latency 400ms, so it should be the fastest model
      expect(insights.fastestModel?.providerId).toBe('groq');
      expect(insights.fastestModel?.modelId).toBe('llama-3.3-70b-versatile');
      expect(insights.fastestModel?.avgLatencyMs).toBe(400);
      expect(insights.fastestModel?.isFastest).toBe(true);

      // Verify character throughput estimate
      expect(insights.fastestModel?.charsPerSecEstimate).toBeGreaterThan(1000);

      // Reliability check: Groq and Gemini are 100%, OpenRouter is 50%
      const openRouterInsight = insights.modelInsights.find(
        (m) => m.providerId === 'openrouter'
      );
      expect(openRouterInsight?.successRate).toBe(0.5);

      // Insights list should be ordered ascending by average latency
      expect(insights.modelInsights[0].avgLatencyMs).toBeLessThanOrEqual(
        insights.modelInsights[1].avgLatencyMs
      );
    });

    it('excludes 0ms cached records from hardware benchmarks while retaining them in total turns', () => {
      const records: AiModelMetricRecord[] = [
        {
          id: 'c1',
          providerId: 'cached',
          modelId: 'Instant Cache',
          latencyMs: 0,
          characterCount: 500,
          hadThinking: false,
          status: 'success',
          timestamp: 100,
        },
        {
          id: 'g1',
          providerId: 'gemini',
          modelId: 'gemini-2.5-flash',
          latencyMs: 800,
          characterCount: 800,
          hadThinking: true,
          status: 'success',
          timestamp: 200,
        },
      ];

      const result = computeModelInsights(records);
      expect(result.totalGenerations).toBe(2);
      // Hardware benchmark only considers gemini-2.5-flash
      expect(result.fastestModel?.modelId).toBe('gemini-2.5-flash');
      expect(result.overallAvgLatencyMs).toBe(800);
    });
  });
});
