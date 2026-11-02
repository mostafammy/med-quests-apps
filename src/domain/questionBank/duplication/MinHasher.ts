/**
 * Domain Service: MinHash Signature Generator & Jaccard Estimator
 * Layer: Domain (Pure, Deterministic, 0 I/O)
 */

import {
  MINHASH_PERMUTATIONS,
  LSH_BANDS,
  LSH_ROWS_PER_BAND,
  type IMinHasher,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

// Mersenne Prime 2^31 - 1
const MERSENNE_PRIME = 2147483647n;

// Deterministic permutation coefficients (a_i, b_i)
const PERMUTATION_COEFFICIENTS: Array<[bigint, bigint]> = (() => {
  const coeffs: Array<[bigint, bigint]> = [];
  let seed = 42n;

  function next(): bigint {
    seed = (seed * 1664525n + 1013904223n) % 4294967296n;
    return seed;
  }

  for (let i = 0; i < MINHASH_PERMUTATIONS; i++) {
    // a_i must be odd and coprime to Mersenne prime
    const a = (next() % (MERSENNE_PRIME - 1n)) + 1n;
    const b = next() % MERSENNE_PRIME;
    coeffs.push([a, b]);
  }
  return coeffs;
})();

export class MinHasher implements IMinHasher {
  /**
   * Computes 128-element MinHash signature (Uint32Array) from a set of shingle hashes.
   */
  public signature(shingles: ReadonlySet<number>): Uint32Array {
    const sig = new Uint32Array(MINHASH_PERMUTATIONS);
    sig.fill(0xffffffff); // Initialize with max uint32

    if (shingles.size === 0) {
      return sig;
    }

    const shingleArray = Array.from(shingles);

    for (let i = 0; i < MINHASH_PERMUTATIONS; i++) {
      const [a, b] = PERMUTATION_COEFFICIENTS[i];
      let minVal = 0xffffffff;

      for (let sIdx = 0; sIdx < shingleArray.length; sIdx++) {
        const x = BigInt(shingleArray[sIdx] >>> 0);
        const hashVal = Number((a * x + b) % MERSENNE_PRIME);
        if (hashVal < minVal) {
          minVal = hashVal;
        }
      }

      sig[i] = minVal >>> 0;
    }

    return sig;
  }

  /**
   * Generates 32 band keys (e.g. "b00:9f3a1c2e" .. "b31:1a2b3c4d") from the 128 signature.
   */
  public static bandKeys(signature: Uint32Array): readonly string[] {
    const keys: string[] = [];

    for (let b = 0; b < LSH_BANDS; b++) {
      let bandHash = 0x811c9dc5;
      const offset = b * LSH_ROWS_PER_BAND;

      for (let r = 0; r < LSH_ROWS_PER_BAND; r++) {
        const val = signature[offset + r];
        // Hash all 4 bytes of val into bandHash
        bandHash ^= val & 0xff;
        bandHash = Math.imul(bandHash, 0x01000193);
        bandHash ^= (val >>> 8) & 0xff;
        bandHash = Math.imul(bandHash, 0x01000193);
        bandHash ^= (val >>> 16) & 0xff;
        bandHash = Math.imul(bandHash, 0x01000193);
        bandHash ^= (val >>> 24) & 0xff;
        bandHash = Math.imul(bandHash, 0x01000193);
      }

      const hex = (bandHash >>> 0).toString(16).padStart(8, '0');
      keys.push(`b${String(b).padStart(2, '0')}:${hex}`);
    }

    return keys;
  }

  public bandKeys(signature: Uint32Array): readonly string[] {
    return MinHasher.bandKeys(signature);
  }

  /**
   * Estimates Jaccard similarity (0.0 to 1.0) between two 128-element MinHash signatures.
   */
  public static estimateJaccard(a: Uint32Array, b: Uint32Array): number {
    if (a.length !== MINHASH_PERMUTATIONS || b.length !== MINHASH_PERMUTATIONS) {
      throw new Error(`MinHash signature length must be ${MINHASH_PERMUTATIONS}`);
    }

    let matches = 0;
    for (let i = 0; i < MINHASH_PERMUTATIONS; i++) {
      if (a[i] === b[i]) {
        matches++;
      }
    }

    return matches / MINHASH_PERMUTATIONS;
  }

  public estimateJaccard(a: Uint32Array, b: Uint32Array): number {
    return MinHasher.estimateJaccard(a, b);
  }
}
