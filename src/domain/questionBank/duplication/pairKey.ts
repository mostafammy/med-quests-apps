/**
 * Domain Utility: Symmetric Pair Key Generation
 * Guarantees pairKey(A, B) === pairKey(B, A) with content version awareness.
 */

import type { PairKey } from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { Sha256Hasher } from './sha256.ts';

export async function createPairKey(
  idA: string,
  idB: string,
  versionA = 1,
  versionB = 1
): Promise<PairKey> {
  return Sha256Hasher.computePairKey(idA, idB, versionA, versionB);
}
