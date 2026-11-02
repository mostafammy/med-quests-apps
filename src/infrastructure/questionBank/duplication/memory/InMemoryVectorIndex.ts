/**
 * Infrastructure Fake: In-Memory Vector Index
 * Implements IVectorIndex with pure TypeScript cosine distance calculation.
 */

import { ok, type Result } from '../../../../domain/shared/result.ts';
import type {
  IVectorIndex,
  QddDegradationReason,
  QddScope,
  VectorMatch,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export interface InMemoryVectorRecord {
  readonly questionId: string;
  readonly vector: Float32Array;
  readonly blockId: string;
  readonly chapterId: string;
}

export class InMemoryVectorIndex implements IVectorIndex {
  private readonly items = new Map<string, InMemoryVectorRecord>();

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    const len = Math.min(a.length, b.length);

    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0.0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public async query(
    vector: Float32Array,
    scope: QddScope,
    topK = 10,
    signal?: AbortSignal
  ): Promise<Result<readonly VectorMatch[], QddDegradationReason>> {
    if (signal?.aborted) {
      return ok([]);
    }

    const matches: VectorMatch[] = [];

    for (const item of this.items.values()) {
      if (scope.kind === 'block' && item.blockId !== scope.blockId) continue;
      if (scope.kind === 'chapter') {
        if (item.blockId !== scope.blockId || item.chapterId !== scope.chapterId) continue;
      }

      const cosine = this.cosineSimilarity(vector, item.vector);
      matches.push({ questionId: item.questionId, cosine });
    }

    matches.sort((a, b) => b.cosine - a.cosine);
    return ok(matches.slice(0, topK));
  }

  public async upsert(
    items: readonly {
      readonly questionId: string;
      readonly vector: Float32Array;
      readonly blockId: string;
      readonly chapterId: string;
    }[]
  ): Promise<Result<void, QddDegradationReason>> {
    for (const item of items) {
      this.items.set(item.questionId, item);
    }
    return ok(undefined);
  }

  public async remove(questionIds: readonly string[]): Promise<Result<void, QddDegradationReason>> {
    for (const qid of questionIds) {
      this.items.delete(qid);
    }
    return ok(undefined);
  }

  public clear(): void {
    this.items.clear();
  }
}
