/**
 * Infrastructure Adapter: VectorizeIndexAdapter
 * Implements IVectorIndex using Cloudflare Vectorize HNSW vector database.
 * Supports metadata filtering by curriculum block and cosine distance matching.
 * Layer: Infrastructure
 */

import type {
  IVectorIndex,
  VectorMatch,
  QddScope,
  QddDegradationReason,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import type { Result } from '../../../../domain/shared/result.ts';

export interface CloudflareVectorizeBinding {
  query(
    vector: number[] | Float32Array,
    options?: {
      topK?: number;
      namespace?: string;
      returnValues?: boolean;
      returnMetadata?: boolean;
      filter?: Record<string, unknown>;
    }
  ): Promise<{
    matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>;
    count: number;
  }>;
  upsert(
    vectors: Array<{
      id: string;
      values: number[] | Float32Array;
      namespace?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<{ mutationId: string }>;
  deleteByIds(ids: string[]): Promise<{ mutationId: string }>;
}

export class VectorizeIndexAdapter implements IVectorIndex {
  constructor(private readonly vectorize: CloudflareVectorizeBinding) {}

  public async query(
    vector: Float32Array,
    scope: QddScope,
    topK = 20,
    signal?: AbortSignal
  ): Promise<Result<readonly VectorMatch[], QddDegradationReason>> {
    if (signal?.aborted) {
      return { ok: false, error: 'STAGE_TIMEOUT' };
    }

    try {
      const filter = scope.kind === 'block' ? { blockId: scope.blockId } : undefined;
      const res = await this.vectorize.query(vector, {
        topK,
        returnMetadata: true,
        filter,
      });

      const matches: VectorMatch[] = (res.matches || []).map((m) => ({
        questionId: m.id,
        cosine: m.score,
      }));

      return { ok: true, value: matches };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('timeout') || message.includes('aborted')) {
        return { ok: false, error: 'STAGE_TIMEOUT' };
      }
      return { ok: false, error: 'VECTOR_INDEX_UNAVAILABLE' };
    }
  }

  public async upsert(
    items: readonly {
      readonly questionId: string;
      readonly vector: Float32Array;
      readonly blockId: string;
      readonly chapterId: string;
    }[]
  ): Promise<Result<void, QddDegradationReason>> {
    if (items.length === 0) {
      return { ok: true, value: undefined };
    }

    try {
      const payload = items.map((item) => ({
        id: item.questionId,
        values: item.vector,
        metadata: {
          blockId: item.blockId,
          chapterId: item.chapterId,
        },
      }));

      await this.vectorize.upsert(payload);
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: 'VECTOR_INDEX_UNAVAILABLE' };
    }
  }

  public async remove(questionIds: readonly string[]): Promise<Result<void, QddDegradationReason>> {
    if (questionIds.length === 0) {
      return { ok: true, value: undefined };
    }

    try {
      await this.vectorize.deleteByIds([...questionIds]);
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: 'VECTOR_INDEX_UNAVAILABLE' };
    }
  }
}
