/**
 * Infrastructure Adapter: WorkersAiReranker
 * Implements IPairReranker using Cloudflare Workers AI model `@cf/baai/bge-reranker-base`.
 * Applies Platt score calibration to produce calibrated probability scores.
 * Layer: Infrastructure
 */

import type {
  IPairReranker,
  QddDegradationReason,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import type { Result } from '../../../../domain/shared/result.ts';

export interface RerankerAiBinding {
  run(
    model: string,
    inputs: { query: string; contexts: readonly string[] }
  ): Promise<{ results?: Array<{ index: number; score: number }> }>;
}

export class WorkersAiReranker implements IPairReranker {
  private readonly modelId = '@cf/baai/bge-reranker-base';

  // Calibrated Platt scaling parameters: sigmoid(A * x + B)
  private readonly plattA = 1.25;
  private readonly plattB = -0.15;

  constructor(private readonly ai: RerankerAiBinding) {}

  public async score(
    query: string,
    candidates: readonly string[],
    signal?: AbortSignal
  ): Promise<Result<readonly number[], QddDegradationReason>> {
    if (candidates.length === 0) {
      return { ok: true, value: [] };
    }

    if (signal?.aborted) {
      return { ok: false, error: 'STAGE_TIMEOUT' };
    }

    try {
      const response = await this.ai.run(this.modelId, {
        query,
        contexts: candidates,
      });

      if (!response || !response.results) {
        return { ok: false, error: 'RERANKER_UNAVAILABLE' };
      }

      const scores = new Array<number>(candidates.length).fill(0.5);

      for (const item of response.results) {
        if (item.index >= 0 && item.index < candidates.length) {
          // Platt Sigmoid Calibration to [0, 1] probability
          const raw = item.score;
          const calibrated = 1 / (1 + Math.exp(-(this.plattA * raw + this.plattB)));
          scores[item.index] = Math.max(0, Math.min(1, calibrated));
        }
      }

      return { ok: true, value: scores };
    } catch (err: any) {
      const message = err?.message || String(err);
      if (message.includes('timeout') || message.includes('aborted')) {
        return { ok: false, error: 'STAGE_TIMEOUT' };
      }
      return { ok: false, error: 'RERANKER_UNAVAILABLE' };
    }
  }
}
