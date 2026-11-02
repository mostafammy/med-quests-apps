/**
 * Domain Helper: Shingling for MinHash
 * Extracts word 3-shingles (or character 5-grams for short stems) and hashes to uint32.
 */

// 32-bit FNV-1a hash for string tokens
export function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class ShingleExtractor {
  /**
   * Produces a Set of 32-bit uint hash values representing the n-gram shingles of text.
   */
  public static extractShingles(normalizedText: string): Set<number> {
    const tokens = normalizedText.match(/\b\w+\b/g) || [];
    const shingles = new Set<number>();

    if (tokens.length >= 3) {
      // Word 3-shingles
      for (let i = 0; i <= tokens.length - 3; i++) {
        const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
        shingles.add(fnv1a32(trigram));
      }
    } else {
      // Character 5-grams fallback for very short stems
      const clean = normalizedText.replace(/\s+/g, ' ').trim();
      const k = 5;
      if (clean.length <= k) {
        shingles.add(fnv1a32(clean));
      } else {
        for (let i = 0; i <= clean.length - k; i++) {
          shingles.add(fnv1a32(clean.slice(i, i + k)));
        }
      }
    }

    return shingles;
  }
}
