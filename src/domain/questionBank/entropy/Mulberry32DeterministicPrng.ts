import type {
  DeterministicPrngSeed,
  IDeterministicPrngPort,
} from '../../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';

/**
 * Pure Deterministic PRNG Implementation (Mulberry32 + 32-bit FNV-1a Hashing)
 * Honors Open/Closed and Liskov Substitution principles.
 */
export class Mulberry32DeterministicPrng implements IDeterministicPrngPort {
  /**
   * Hashes an arbitrary string into a deterministic 32-bit unsigned seed using FNV-1a.
   */
  public hashStringToSeed(seedInput: string): DeterministicPrngSeed {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seedInput.length; i++) {
      hash ^= seedInput.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) as DeterministicPrngSeed;
  }

  /**
   * Creates a stateful uniform [0, 1) float generator using the Mulberry32 algorithm.
   */
  public createGenerator(seed: DeterministicPrngSeed): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Executes an unbiased Fisher-Yates (Knuth) shuffle on an immutable array.
   */
  public shuffle<T>(items: readonly T[], seedInput: string): readonly T[] {
    const array = [...items];
    const rng = this.createGenerator(this.hashStringToSeed(seedInput));
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = array[i]!;
      array[i] = array[j]!;
      array[j] = temp;
    }
    return array;
  }
}
