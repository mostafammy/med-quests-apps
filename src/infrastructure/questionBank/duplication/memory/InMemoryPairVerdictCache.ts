/**
 * Infrastructure Test Fake: InMemoryPairVerdictCache
 * Implements IPairVerdictCache in memory for fast, deterministic unit & contract testing.
 * Layer: Infrastructure
 */

import type {
  IPairVerdictCache,
  LlmArbiterVerdict,
  PairKey,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class InMemoryPairVerdictCache implements IPairVerdictCache {
  private readonly cache = new Map<PairKey, LlmArbiterVerdict>();

  public async get(key: PairKey): Promise<LlmArbiterVerdict | null> {
    return this.cache.get(key) ?? null;
  }

  public async put(key: PairKey, verdict: LlmArbiterVerdict): Promise<void> {
    this.cache.set(key, verdict);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}
