/**
 * Infrastructure Fake: Hashing Embedding Provider
 * Generates 384-dimensional deterministic unit vectors for hermetic offline testing.
 */

import { ok, type Result } from '../../../../domain/shared/result.ts';
import type {
  EmbeddingModelId,
  IEmbeddingProvider,
  QddDegradationReason,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { fnv1a32 } from '../../../../domain/questionBank/duplication/shingles.ts';

export class HashingEmbeddingFake implements IEmbeddingProvider {
  public readonly modelId: EmbeddingModelId = 'local-hashing-v1';
  public readonly dimensions = 384;

  public async embed(
    texts: readonly string[],
    signal?: AbortSignal
  ): Promise<Result<readonly Float32Array[], QddDegradationReason>> {
    if (signal?.aborted) {
      return ok([]);
    }

    const vectors: Float32Array[] = [];

    for (const text of texts) {
      const vec = new Float32Array(this.dimensions);
      const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];

      for (let i = 0; i < tokens.length; i++) {
        const hash = fnv1a32(tokens[i]);
        const index = hash % this.dimensions;
        vec[index] += 1.0;

        // Add bigram contribution if available
        if (i < tokens.length - 1) {
          const bigramHash = fnv1a32(`${tokens[i]} ${tokens[i + 1]}`);
          const biIndex = bigramHash % this.dimensions;
          vec[biIndex] += 1.5;
        }
      }

      // Normalize to unit L2 norm
      let norm = 0.0;
      for (let j = 0; j < this.dimensions; j++) {
        norm += vec[j] * vec[j];
      }
      norm = Math.sqrt(norm);
      if (norm > 0) {
        for (let j = 0; j < this.dimensions; j++) {
          vec[j] /= norm;
        }
      }

      vectors.push(vec);
    }

    return ok(vectors);
  }
}
