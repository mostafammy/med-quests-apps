/**
 * Domain Helper: Cryptographic SHA-256 Hash Utilities
 * Pure domain, zero I/O, works in Browser, Cloudflare Workers (workerd), and Node.js.
 */

import type {
  CanonicalStemHash,
  CanonicalItemHash,
  AnswerKeyHash,
  PairKey,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class Sha256Hasher {
  /**
   * Computes standard hex-encoded SHA-256 digest asynchronously using Web Crypto API.
   */
  public static async digest(text: string): Promise<string> {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
      const encoder = new TextEncoder();
      const buffer = encoder.encode(text);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return this.fallbackDigest(text);
  }

  /**
   * Computes branded hashes.
   */
  public static async computeStemHash(stem: string): Promise<CanonicalStemHash> {
    return (await this.digest(stem)) as CanonicalStemHash;
  }

  public static async computeItemHash(itemContent: string): Promise<CanonicalItemHash> {
    return (await this.digest(itemContent)) as CanonicalItemHash;
  }

  public static async computeAnswerKeyHash(answerKeyText: string): Promise<AnswerKeyHash> {
    return (await this.digest(answerKeyText)) as AnswerKeyHash;
  }

  public static async computePairKey(
    idA: string,
    idB: string,
    versionA: number = 1,
    versionB: number = 1
  ): Promise<PairKey> {
    // Symmetrically order the IDs and versions so pairKey(A, B, vA, vB) === pairKey(B, A, vB, vA)
    let firstId = idA;
    let secondId = idB;
    let firstVer = versionA;
    let secondVer = versionB;

    if (idA > idB || (idA === idB && versionA > versionB)) {
      firstId = idB;
      secondId = idA;
      firstVer = versionB;
      secondVer = versionA;
    }

    const payload = `${firstId}:${firstVer}|${secondId}:${secondVer}`;
    const hex = await this.digest(payload);
    return hex as PairKey;
  }

  /**
   * Pure JS synchronous SHA-256 implementation as an unbreakable fallback
   * if Web Crypto is temporarily stubbed or in test environments.
   */
  public static fallbackDigest(input: string): string {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    let H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    const bytes = new TextEncoder().encode(input);
    const l = bytes.length * 8;
    const k = (448 - ((l + 8) % 512) + 512) % 512;
    const totalBytes = bytes.length + 1 + Math.floor(k / 8) + 8;
    const padded = new Uint8Array(totalBytes);
    padded.set(bytes);
    padded[bytes.length] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(totalBytes - 4, l, false);

    const w = new Uint32Array(64);
    for (let chunk = 0; chunk < totalBytes; chunk += 64) {
      for (let i = 0; i < 16; i++) {
        w[i] = view.getUint32(chunk + i * 4, false);
      }
      for (let i = 16; i < 64; i++) {
        const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
        const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      let [a, b, c, d, e, f, g, h] = H;

      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }

      H = [
        (H[0] + a) | 0,
        (H[1] + b) | 0,
        (H[2] + c) | 0,
        (H[3] + d) | 0,
        (H[4] + e) | 0,
        (H[5] + f) | 0,
        (H[6] + g) | 0,
        (H[7] + h) | 0,
      ];
    }

    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
}
