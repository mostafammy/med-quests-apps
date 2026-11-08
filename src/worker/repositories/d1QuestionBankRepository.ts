/**
 * Worker Repository: D1 Question Bank Seeding, Revisioning & Row Hydration
 */

import type { Question } from '../../domain/model/types.ts';
import { QuestionNormalizer } from '../../domain/questionBank/QuestionNormalizer.ts';
import { QuestionD1Mapper } from '../../infrastructure/questionBank/QuestionD1Mapper.ts';
import type { GovernedQuestion } from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { WorkerSeedBankRegistry } from '../curriculum/WorkerSeedBankRegistry.ts';
import type { D1DatabaseBinding } from '../types.ts';

export function buildDefaultSeededBank(blockId: string = 'cvs'): GovernedQuestion[] {
  const seedQuestions = WorkerSeedBankRegistry.getSeedQuestions(blockId);
  if (!Array.isArray(seedQuestions) || seedQuestions.length === 0) return [];
  return QuestionNormalizer.enrichBundledQuestions(seedQuestions as Question[], {
    blockId,
    provenanceScope: 'global-canonical',
  });
}

export function mapRowToGovernedQuestion(
  row: Record<string, unknown>
): GovernedQuestion {
  return QuestionD1Mapper.toDomain(row);
}

export async function bumpD1BlockRevision(
  db: D1DatabaseBinding,
  blockId: string
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO bank_revisions (block_id, revision_number, updated_at)
       VALUES (?, 2, datetime('now'))
       ON CONFLICT(block_id) DO UPDATE SET
         revision_number = bank_revisions.revision_number + 1,
         updated_at = datetime('now')`
    )
    .bind(blockId)
    .run();

  const revRow = await db
    .prepare('SELECT revision_number FROM bank_revisions WHERE block_id = ?')
    .bind(blockId)
    .first<{ revision_number: number }>();

  return revRow ? revRow.revision_number : 2;
}

export async function ensureGlobalBankSeeded(
  db: D1DatabaseBinding,
  blockId: string
): Promise<void> {
  const seedQuestions = WorkerSeedBankRegistry.getSeedQuestions(blockId);
  if (!Array.isArray(seedQuestions) || seedQuestions.length === 0) return;

  const seeded = buildDefaultSeededBank(blockId);
  if (seeded.length === 0) return;

  const existingRows = await db
    .prepare(
      'SELECT id, bank_version, author_id FROM global_questions WHERE block_id = ?'
    )
    .bind(blockId)
    .all<{ id: string; bank_version: number; author_id: string }>();
  const existingMap = new Map(
    (existingRows.results || []).map((row) => [row.id, row])
  );
  const missing = seeded.filter((question) => !existingMap.has(question.id));

  // Reconcile existing bundled questions if bundled seeds have higher bankVersion
  const toUpgrade = seeded.filter((q) => {
    const existing = existingMap.get(q.id);
    return (
      existing &&
      (existing.bank_version || 1) < (q.bankVersion || 1) &&
      (existing.author_id === 'usr-curriculum-faculty' || !existing.author_id)
    );
  });

  if (toUpgrade.length > 0) {
    const updateSql = `UPDATE global_questions
                       SET choices_json = ?, bank_version = ?, stem_hash = ?, updated_at = datetime('now')
                       WHERE id = ? AND bank_version < ?`;
    const updateStmts = toUpgrade.map((q) =>
      db
        .prepare(updateSql)
        .bind(
          JSON.stringify(q.choices),
          q.bankVersion || 2,
          q.stemHash,
          q.id,
          q.bankVersion || 2
        )
    );
    if (typeof db.batch === 'function') {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < updateStmts.length; i += CHUNK_SIZE) {
        await db.batch.call(db, updateStmts.slice(i, i + CHUNK_SIZE));
      }
    } else {
      for (const statement of updateStmts) {
        await statement.run();
      }
    }
  }

  if (missing.length === 0) return;

  const revRow = await db
    .prepare('SELECT revision_number FROM bank_revisions WHERE block_id = ?')
    .bind(blockId)
    .first<{ revision_number: number }>();
  const targetRevision = Number(revRow?.revision_number ?? 1) + 1;

  const statements = missing.map((q) => {
    const stmt = QuestionD1Mapper.buildUpsertStatement(
      { ...q, globalRevision: targetRevision },
      'seed_ignore'
    );
    return db.prepare(stmt.sql).bind(...stmt.params);
  });

  let insertedCount = 0;
  if (typeof db.batch === 'function') {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
      const results = await db.batch.call(db, statements.slice(i, i + CHUNK_SIZE));
      insertedCount += results.reduce(
        (sum, result) => sum + (result.meta?.changes || 0),
        0
      );
    }
  } else {
    for (const statement of statements) {
      await statement.run();
      insertedCount += 1;
    }
  }

  if (insertedCount > 0) {
    await db
      .prepare(
        `INSERT INTO bank_revisions (block_id, revision_number, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(block_id) DO UPDATE SET
           revision_number = CASE WHEN bank_revisions.revision_number < excluded.revision_number THEN excluded.revision_number ELSE bank_revisions.revision_number END,
           updated_at = datetime('now')`
      )
      .bind(blockId, targetRevision)
      .run();
  }
}
