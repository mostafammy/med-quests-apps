/**
 * Infrastructure Service: DexieFingerprintCache
 * Indexes synced canonical bank and local custom questions inside Dexie IndexedDB
 * Enables 100% offline, < 16ms advisory duplicate hints in the Question Studio.
 * Layer: Infrastructure
 */

import { db, type QuestionFingerprintRecord } from '../../../storage/db.ts';
import { QuestionCanonicalizerV2 } from '../../../../domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { MinHasher } from '../../../../domain/questionBank/duplication/MinHasher.ts';
import type { Question } from '../../../../domain/model/types.ts';
import type {
  AnswerKeyHash,
  CanonicalItemHash,
  CanonicalStemHash,
  QuestionFingerprint,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export class DexieFingerprintCache {
  private readonly canonicalizer = new QuestionCanonicalizerV2();
  private readonly minHasher = new MinHasher();

  /**
   * Retrieves all cached fingerprints for a given block.
   */
  public async getAllByBlock(blockId: string): Promise<readonly QuestionFingerprint[]> {
    try {
      const records = await db.questionFingerprints.where('blockId').equals(blockId).toArray();
      return records.map(this.toDomain);
    } catch {
      return [];
    }
  }

  /**
   * Persists a single question fingerprint into Dexie.
   */
  public async put(fp: QuestionFingerprint): Promise<void> {
    try {
      await db.questionFingerprints.put(this.toRecord(fp));
    } catch {
      // Non-blocking storage fallback
    }
  }

  /**
   * Persists a batch of fingerprints into Dexie.
   */
  public async bulkPut(fps: readonly QuestionFingerprint[]): Promise<void> {
    try {
      const records = fps.map((fp) => this.toRecord(fp));
      await db.questionFingerprints.bulkPut(records);
    } catch {
      // Non-blocking storage fallback
    }
  }

  /**
   * Synchronizes cache from an array of Question models.
   * Efficiently computes fingerprints for any questions missing from the cache.
   * Returns the full array of fingerprints for the block.
   */
  public async syncFromQuestions(
    questions: readonly Question[],
    blockId = 'cvs'
  ): Promise<readonly QuestionFingerprint[]> {
    if (questions.length === 0) {
      return this.getAllByBlock(blockId);
    }

    try {
      const existing = await this.getAllByBlock(blockId);
      const existingMap = new Map(existing.map((fp) => [fp.questionId, fp]));

      const toCompute: Question[] = [];
      const result: QuestionFingerprint[] = [];

      for (const q of questions) {
        const found = existingMap.get(q.id);
        if (found) {
          result.push(found);
        } else {
          toCompute.push(q);
        }
      }

      if (toCompute.length > 0) {
        const newlyComputed: QuestionFingerprint[] = [];

        for (const q of toCompute) {
          const canonical = await this.canonicalizer.canonicalize(q);
          const sig = this.minHasher.signature(canonical.shingles);
          const bands = this.minHasher.bandKeys(sig);

          const fp: QuestionFingerprint = {
            questionId: q.id,
            blockId: q.blockId || blockId,
            chapterId: q.chapterId,
            normalizerVersion: canonical.normalizerVersion,
            stemHash: canonical.stemHash,
            itemHash: canonical.itemHash,
            answerKeyHash: canonical.answerKeyHash,
            minhash: sig,
            lshBands: bands,
            discriminators: canonical.discriminators,
            embeddingModel: null,
            embeddedAt: null,
            contentVersion: 1,
          };

          newlyComputed.push(fp);
          result.push(fp);
        }

        await this.bulkPut(newlyComputed);
      }

      return result;
    } catch {
      return [];
    }
  }

  /**
   * Clears all cached fingerprints.
   */
  public async clear(): Promise<void> {
    try {
      await db.questionFingerprints.clear();
    } catch {
      // Non-blocking
    }
  }

  private toDomain(record: QuestionFingerprintRecord): QuestionFingerprint {
    const minhashArr =
      record.minhash instanceof Uint32Array
        ? record.minhash
        : new Uint32Array(record.minhash);

    return {
      questionId: record.questionId,
      blockId: record.blockId,
      chapterId: record.chapterId,
      normalizerVersion: record.normalizerVersion as any,
      stemHash: record.stemHash as CanonicalStemHash,
      itemHash: record.itemHash as CanonicalItemHash,
      answerKeyHash: record.answerKeyHash as AnswerKeyHash,
      minhash: minhashArr,
      lshBands: record.lshBands,
      discriminators: record.discriminators,
      embeddingModel: record.embeddingModel as any,
      embeddedAt: record.embeddedAt,
      contentVersion: record.contentVersion,
    };
  }

  private toRecord(fp: QuestionFingerprint): QuestionFingerprintRecord {
    return {
      questionId: fp.questionId,
      blockId: fp.blockId,
      chapterId: fp.chapterId,
      normalizerVersion: fp.normalizerVersion,
      stemHash: fp.stemHash,
      itemHash: fp.itemHash,
      answerKeyHash: fp.answerKeyHash,
      minhash: Array.from(fp.minhash),
      lshBands: [...fp.lshBands],
      discriminators: [...fp.discriminators],
      embeddingModel: fp.embeddingModel,
      embeddedAt: fp.embeddedAt,
      contentVersion: fp.contentVersion,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const dexieFingerprintCache = new DexieFingerprintCache();
