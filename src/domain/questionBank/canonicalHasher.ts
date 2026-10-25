/**
 * Domain Service: Stem Normalization & Cryptographic Deduplication Hasher
 * Layer: Domain (Zero external I/O, 100% Deterministic)
 */

import type { StemSha256Hash } from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export class QuestionCanonicalHasher {
  /**
   * Normalizes question stem text by:
   * 1. Stripping leading/trailing whitespace
   * 2. Collapsing internal whitespace/newlines to single spaces
   * 3. Removing punctuation/casing variations that don't alter clinical meaning
   */
  public static normalizeStemText(rawStem: string): string {
    return rawStem
      .trim()
      .toLowerCase()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/["'’“”]/g, '')
      .trim();
  }

  /**
   * Asynchronously calculates a standard hex-encoded SHA-256 fingerprint
   * using Web Crypto API (SubtleCrypto), available in modern browsers and Cloudflare Workers.
   */
  public static async computeStemHashAsync(rawStem: string): Promise<StemSha256Hash> {
    const normalized = this.normalizeStemText(rawStem);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buffer = new TextEncoder().encode(normalized);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return hex as StemSha256Hash;
    }
    return this.computeStemHashSync(rawStem);
  }

  /**
   * Synchronous fallback fingerprint algorithm (64-character deterministic pseudo-SHA256 hex)
   * used when SubtleCrypto is not synchronously awaitable in local unit tests or offline synchronous loops.
   */
  public static computeStemHashSync(rawStem: string): StemSha256Hash {
    const normalized = this.normalizeStemText(rawStem);
    let h1 = 0xdeadbeef ^ normalized.length;
    let h2 = 0x41c64e6d ^ normalized.length;
    let h3 = 0x12345678 ^ normalized.length;
    let h4 = 0x87654321 ^ normalized.length;

    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ ch, 2246822519);
      h4 = Math.imul(h4 ^ ch, 3266489917);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822519) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489917);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2654435761) ^ Math.imul(h3 ^ (h3 >>> 13), 1597334677);
    h3 = Math.imul(h3 ^ (h3 >>> 16), 1597334677) ^ Math.imul(h4 ^ (h4 >>> 13), 2246822519);
    h4 = Math.imul(h4 ^ (h4 >>> 16), 3266489917) ^ Math.imul(h1 ^ (h1 >>> 13), 2654435761);

    const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
    const p3 = (h3 >>> 0).toString(16).padStart(8, '0');
    const p4 = (h4 >>> 0).toString(16).padStart(8, '0');

    // Produce an exact 64-char hex string mirroring SHA-256 length
    const full = `${p1}${p2}${p3}${p4}${p4}${p3}${p2}${p1}`;
    return full as StemSha256Hash;
  }
}
