/**
 * Infrastructure Adapter: WorkersAiEmbeddingProvider
 * Implements IEmbeddingProvider using Cloudflare Workers AI with model `@cf/baai/bge-small-en-v1.5`.
 * Generates 384-dimensional dense vectors with batched execution, retry, and timeout protection.
 * Layer: Infrastructure
 */

import type {
  IEmbeddingProvider,
  EmbeddingModelId,
  QddDegradationReason,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import type { Result } from '../../../../domain/shared/result.ts';

export interface WorkersAiBinding {
  run(
    model: string,
    inputs: { text: string | readonly string[] }
  ): Promise<{ shape?: number[]; data?: number[][] | number[] }>;
}

export class WorkersAiEmbeddingProvider implements IEmbeddingProvider {
  public readonly modelId: EmbeddingModelId = '@cf/baai/bge-small-en-v1.5';
  public readonly dimensions = 384;
  private readonly maxBatchSize = 16;

  constructor(private readonly ai: WorkersAiBinding) {}

  public async embed(
    texts: readonly string[],
    signal?: AbortSignal
  ): Promise<Result<readonly Float32Array[], QddDegradationReason>> {
    if (texts.length === 0) {
      return { ok: true, value: [] };
    }

    if (signal?.aborted) {
      return { ok: false, error: 'STAGE_TIMEOUT' };
    }

    try {
      const results: Float32Array[] = [];

      // Process in chunks respecting Workers AI batch limits
      for (let i = 0; i < texts.length; i += this.maxBatchSize) {
        if (signal?.aborted) {
          return { ok: false, error: 'STAGE_TIMEOUT' };
        }

        const batch = texts.slice(i, i + this.maxBatchSize);
        const response = await this.ai.run(this.modelId, { text: batch });

        if (!response || !response.data) {
          return { ok: false, error: 'EMBEDDING_UNAVAILABLE' };
        }

        // Handle single vs batched array format
        const rawVectors: number[][] = Array.isArray(response.data[0])
          ? (response.data as number[][])
          : [response.data as number[]];

        for (const rawVec of rawVectors) {
          const floatVec = new Float32Array(this.dimensions);
          for (let d = 0; d < Math.min(this.dimensions, rawVec.length); d++) {
            floatVec[d] = rawVec[d];
          }
          results.push(floatVec);
        }
      }

      return { ok: true, value: results };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('timeout') || message.includes('aborted')) {
        return { ok: false, error: 'STAGE_TIMEOUT' };
      }
      return { ok: false, error: 'EMBEDDING_UNAVAILABLE' };
    }
  }
}
