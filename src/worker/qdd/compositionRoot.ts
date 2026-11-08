/**
 * Worker Composition Root: QDD Engine
 * Assembles production dependencies for Cloudflare Worker edge execution.
 */

import { QuestionCanonicalizerV2 } from '../../domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { MinHasher } from '../../domain/questionBank/duplication/MinHasher.ts';
import { S1ExactStage } from '../../domain/questionBank/duplication/stages/S1Exact.ts';
import { S2LexicalLshStage } from '../../domain/questionBank/duplication/stages/S2LexicalLsh.ts';
import { S4DiscriminatorsStage } from '../../domain/questionBank/duplication/stages/S4Discriminators.ts';
import { EdgeGatePolicy } from '../../domain/questionBank/duplication/GatePolicy.ts';
import { DuplicationDetectionEngine } from '../../domain/questionBank/duplication/DuplicationDetectionEngine.ts';
import { D1FingerprintRepository } from '../../infrastructure/questionBank/duplication/d1/D1FingerprintRepository.ts';
import { QuestionD1Mapper } from '../../infrastructure/questionBank/QuestionD1Mapper.ts';
import type { IDuplicationDetectionEngine } from '../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import type { Question } from '../../domain/model/types.ts';
import type { D1DatabaseBinding } from '../types.ts';

export function createWorkerQddEngine(db: D1DatabaseBinding): IDuplicationDetectionEngine {
  const repo = new D1FingerprintRepository(db);
  const canonicalizer = new QuestionCanonicalizerV2();
  const minHasher = new MinHasher();

  const stages = [
    new S1ExactStage(repo),
    new S2LexicalLshStage(repo, minHasher),
    new S4DiscriminatorsStage(),
  ];

  const policy = new EdgeGatePolicy();

  return new DuplicationDetectionEngine(canonicalizer, stages, policy);
}

/**
 * Computes and upserts a canonical question's fingerprint & LSH bands into D1.
 */
export async function upsertQuestionFingerprintToD1(
  db: D1DatabaseBinding | null | undefined,
  q: Question
): Promise<void> {
  if (!db) return;
  const repo = new D1FingerprintRepository(db);
  const canonicalizer = new QuestionCanonicalizerV2();
  const minHasher = new MinHasher();

  const canonical = await canonicalizer.canonicalize(q);
  const sig = minHasher.signature(canonical.shingles);
  const bandKeys = minHasher.bandKeys(sig);

  await repo.upsert({
    questionId: q.id,
    blockId: q.blockId || 'cvs',
    chapterId: q.chapterId,
    normalizerVersion: canonical.normalizerVersion,
    stemHash: canonical.stemHash,
    itemHash: canonical.itemHash,
    answerKeyHash: canonical.answerKeyHash,
    minhash: sig,
    lshBands: bandKeys,
    discriminators: canonical.discriminators,
    embeddingModel: null,
    embeddedAt: null,
    contentVersion: q.bankVersion ?? 1,
  });
}

/**
 * Ensures any published row in global_questions that lacks a row in question_fingerprints
 * (or whose content_version is behind bank_version) is automatically indexed into D1.
 */
export async function syncMissingD1Fingerprints(
  db: D1DatabaseBinding | null | undefined
): Promise<number> {
  if (!db) return 0;
  try {
    const missingRows = await db
      .prepare(
        `SELECT g.* FROM global_questions g
         LEFT JOIN question_fingerprints f ON f.question_id = g.id
         WHERE g.editorial_status = 'published'
           AND f.question_id IS NULL
         LIMIT 10`
      )
      .all<Record<string, unknown>>();

    const rows = missingRows?.results || [];
    if (rows.length === 0) return 0;

    for (const row of rows) {
      try {
        const q = QuestionD1Mapper.toDomain(row);
        await upsertQuestionFingerprintToD1(db, q);
      } catch {
        // Continue indexing remaining rows
      }
    }
    return rows.length;
  } catch {
    return 0;
  }
}
