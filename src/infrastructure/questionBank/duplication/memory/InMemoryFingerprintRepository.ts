/**
 * Infrastructure Fake: In-Memory Fingerprint Repository
 * Used for hermetic unit testing, offline browser advisory index, and CI runs.
 */

import { ok, type Result } from '../../../../domain/shared/result.ts';
import type {
  CanonicalItemHash,
  CanonicalStemHash,
  IFingerprintRepository,
  QddError,
  QddScope,
  QuestionFingerprint,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class InMemoryFingerprintRepository implements IFingerprintRepository {
  private readonly fingerprints = new Map<string, QuestionFingerprint>();
  private readonly itemHashIndex = new Map<string, Set<string>>();
  private readonly stemHashIndex = new Map<string, Set<string>>();
  private readonly lshBandIndex = new Map<string, Set<string>>();

  private scopeMatches(scope: QddScope, fp: QuestionFingerprint): boolean {
    if (scope.kind === 'batch-only') return true;
    if (scope.kind === 'block') return fp.blockId === scope.blockId;
    if (scope.kind === 'chapter') {
      return fp.blockId === scope.blockId && fp.chapterId === scope.chapterId;
    }
    return true;
  }

  public async findById(questionId: string): Promise<QuestionFingerprint | null> {
    return this.fingerprints.get(questionId) ?? null;
  }

  public async findByItemHash(
    scope: QddScope,
    hash: CanonicalItemHash
  ): Promise<readonly QuestionFingerprint[]> {
    const ids = this.itemHashIndex.get(hash) || new Set();
    const results: QuestionFingerprint[] = [];
    for (const id of ids) {
      const fp = this.fingerprints.get(id);
      if (fp && this.scopeMatches(scope, fp)) {
        results.push(fp);
      }
    }
    return results;
  }

  public async findByStemHash(
    scope: QddScope,
    hash: CanonicalStemHash
  ): Promise<readonly QuestionFingerprint[]> {
    const ids = this.stemHashIndex.get(hash) || new Set();
    const results: QuestionFingerprint[] = [];
    for (const id of ids) {
      const fp = this.fingerprints.get(id);
      if (fp && this.scopeMatches(scope, fp)) {
        results.push(fp);
      }
    }
    return results;
  }

  public async findByLshBands(
    scope: QddScope,
    bandKeys: readonly string[],
    limit = 25
  ): Promise<readonly QuestionFingerprint[]> {
    const hitCounts = new Map<string, number>();

    for (const bk of bandKeys) {
      const ids = this.lshBandIndex.get(bk);
      if (ids) {
        for (const id of ids) {
          hitCounts.set(id, (hitCounts.get(id) || 0) + 1);
        }
      }
    }

    const sortedIds = Array.from(hitCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const candidates: QuestionFingerprint[] = [];
    for (const id of sortedIds) {
      const fp = this.fingerprints.get(id);
      if (fp && this.scopeMatches(scope, fp)) {
        candidates.push(fp);
        if (candidates.length >= limit) break;
      }
    }

    return candidates;
  }

  public async upsert(fingerprint: QuestionFingerprint): Promise<Result<void, QddError>> {
    // Clean up old indexes if existing
    await this.remove(fingerprint.questionId);

    this.fingerprints.set(fingerprint.questionId, fingerprint);

    // Index item hash
    if (!this.itemHashIndex.has(fingerprint.itemHash)) {
      this.itemHashIndex.set(fingerprint.itemHash, new Set());
    }
    this.itemHashIndex.get(fingerprint.itemHash)!.add(fingerprint.questionId);

    // Index stem hash
    if (!this.stemHashIndex.has(fingerprint.stemHash)) {
      this.stemHashIndex.set(fingerprint.stemHash, new Set());
    }
    this.stemHashIndex.get(fingerprint.stemHash)!.add(fingerprint.questionId);

    // Index LSH band keys
    for (const bk of fingerprint.lshBands) {
      if (!this.lshBandIndex.has(bk)) {
        this.lshBandIndex.set(bk, new Set());
      }
      this.lshBandIndex.get(bk)!.add(fingerprint.questionId);
    }

    return ok(undefined);
  }

  public async remove(questionId: string): Promise<Result<void, QddError>> {
    const existing = this.fingerprints.get(questionId);
    if (!existing) return ok(undefined);

    this.fingerprints.delete(questionId);
    this.itemHashIndex.get(existing.itemHash)?.delete(questionId);
    this.stemHashIndex.get(existing.stemHash)?.delete(questionId);
    for (const bk of existing.lshBands) {
      this.lshBandIndex.get(bk)?.delete(questionId);
    }

    return ok(undefined);
  }

  public clear(): void {
    this.fingerprints.clear();
    this.itemHashIndex.clear();
    this.stemHashIndex.clear();
    this.lshBandIndex.clear();
  }
}
