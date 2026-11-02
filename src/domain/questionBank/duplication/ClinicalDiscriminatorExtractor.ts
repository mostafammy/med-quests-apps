/**
 * Domain Service: Clinical Discriminator Extractor
 * Layer: Domain (Pure, Deterministic, 0 I/O)
 */

import type {
  ClinicalDiscriminator,
  IClinicalDiscriminatorExtractor,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { CLINICAL_DISCRIMINATOR_PATTERNS } from './discriminatorLexicon.v1.ts';

export class ClinicalDiscriminatorExtractor implements IClinicalDiscriminatorExtractor {
  /**
   * Scans normalized canonical text and extracts all clinical discriminators.
   * Returns a deterministic, sorted, deduplicated array.
   */
  public extract(canonicalStem: string): readonly ClinicalDiscriminator[] {
    const foundTokens = new Map<string, ClinicalDiscriminator>();

    for (const pattern of CLINICAL_DISCRIMINATOR_PATTERNS) {
      // Create a fresh regex instance to avoid stateful lastIndex bugs across calls
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(canonicalStem)) !== null) {
        const token = pattern.formatToken(match);
        if (!foundTokens.has(token)) {
          foundTokens.set(token, {
            kind: pattern.kind,
            token,
          });
        }
      }
    }

    return Array.from(foundTokens.values()).sort((a, b) => a.token.localeCompare(b.token));
  }

  /**
   * Computes the symmetric delta between two discriminator sets.
   * Tokens present in A but not B, or present in B but not A.
   */
  public static computeDelta(
    a: readonly ClinicalDiscriminator[],
    b: readonly ClinicalDiscriminator[]
  ): readonly ClinicalDiscriminator[] {
    const tokensA = new Set(a.map((d) => d.token));
    const tokensB = new Set(b.map((d) => d.token));

    const delta: ClinicalDiscriminator[] = [];

    for (const d of a) {
      if (!tokensB.has(d.token)) {
        delta.push(d);
      }
    }
    for (const d of b) {
      if (!tokensA.has(d.token)) {
        delta.push(d);
      }
    }

    return delta.sort((x, y) => x.token.localeCompare(y.token));
  }
}
