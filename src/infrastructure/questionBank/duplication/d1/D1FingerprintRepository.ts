/**
 * Infrastructure: Cloudflare D1 Fingerprint Repository
 * Manages question fingerprints and inverted LSH band indexes on D1 SQLite.
 */

import { ok, err, type Result } from '../../../../domain/shared/result.ts';
import type {
  CanonicalItemHash,
  CanonicalStemHash,
  IFingerprintRepository,
  QddError,
  QddScope,
  QuestionFingerprint,
  NormalizerVersion,
  EmbeddingModelId,
} from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

interface D1DatabaseLike {
  prepare(query: string): {
    bind(...params: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ success: boolean }>;
    };
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<{ results: T[] }>;
    run(): Promise<{ success: boolean }>;
  };
  batch?(statements: unknown[]): Promise<unknown[]>;
}

interface FingerprintRow {
  question_id: string;
  subject_kind: string;
  block_id: string;
  chapter_id: string;
  topic_id: string;
  editorial_status: string;
  normalizer_version: string;
  stem_hash: string;
  item_hash: string;
  answer_key_hash: string;
  minhash: ArrayBuffer | Uint8Array;
  discriminators_json: string;
  embedding_model: string | null;
  embedded_at: string | null;
  content_version: number;
}

export class D1FingerprintRepository implements IFingerprintRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  private mapRowToFingerprint(row: FingerprintRow): QuestionFingerprint {
    let minhashBytes: Uint8Array;
    if (row.minhash instanceof Uint8Array) {
      minhashBytes = row.minhash;
    } else if (row.minhash instanceof ArrayBuffer) {
      minhashBytes = new Uint8Array(row.minhash);
    } else {
      // In node/miniflare it might be passed as an array or buffer-like
      minhashBytes = new Uint8Array(row.minhash as any);
    }

    const minhashUint32 = new Uint32Array(
      minhashBytes.buffer,
      minhashBytes.byteOffset,
      minhashBytes.byteLength / 4
    );

    return {
      questionId: row.question_id,
      blockId: row.block_id,
      chapterId: row.chapter_id,
      normalizerVersion: row.normalizer_version as NormalizerVersion,
      stemHash: row.stem_hash as CanonicalStemHash,
      itemHash: row.item_hash as CanonicalItemHash,
      answerKeyHash: row.answer_key_hash as any,
      minhash: minhashUint32,
      lshBands: [], // Populated on-demand or loaded via query
      discriminators: JSON.parse(row.discriminators_json || '[]'),
      embeddingModel: (row.embedding_model as EmbeddingModelId) || null,
      embeddedAt: row.embedded_at,
      contentVersion: row.content_version,
    };
  }

  public async findById(questionId: string): Promise<QuestionFingerprint | null> {
    const row = await this.db
      .prepare('SELECT * FROM question_fingerprints WHERE question_id = ? LIMIT 1')
      .bind(questionId)
      .first<FingerprintRow>();

    if (!row) return null;
    return this.mapRowToFingerprint(row);
  }

  public async findByItemHash(
    scope: QddScope,
    hash: CanonicalItemHash
  ): Promise<readonly QuestionFingerprint[]> {
    let query = 'SELECT * FROM question_fingerprints WHERE item_hash = ?';
    const params: unknown[] = [hash];

    if (scope.kind === 'block') {
      query += ' AND block_id = ?';
      params.push(scope.blockId);
    } else if (scope.kind === 'chapter') {
      query += ' AND block_id = ? AND chapter_id = ?';
      params.push(scope.blockId, scope.chapterId);
    }

    const res = await this.db.prepare(query).bind(...params).all<FingerprintRow>();
    return (res.results || []).map((r) => this.mapRowToFingerprint(r));
  }

  public async findByStemHash(
    scope: QddScope,
    hash: CanonicalStemHash
  ): Promise<readonly QuestionFingerprint[]> {
    let query = 'SELECT * FROM question_fingerprints WHERE stem_hash = ?';
    const params: unknown[] = [hash];

    if (scope.kind === 'block') {
      query += ' AND block_id = ?';
      params.push(scope.blockId);
    } else if (scope.kind === 'chapter') {
      query += ' AND block_id = ? AND chapter_id = ?';
      params.push(scope.blockId, scope.chapterId);
    }

    const res = await this.db.prepare(query).bind(...params).all<FingerprintRow>();
    return (res.results || []).map((r) => this.mapRowToFingerprint(r));
  }

  public async findByLshBands(
    scope: QddScope,
    bandKeys: readonly string[],
    limit = 25
  ): Promise<readonly QuestionFingerprint[]> {
    if (bandKeys.length === 0) return [];

    const placeholders = bandKeys.map(() => '?').join(',');
    const blockId = scope.kind === 'block' || scope.kind === 'chapter' ? scope.blockId : 'cvs';

    const sql = `
      SELECT qf.*, COUNT(*) as hit_count
      FROM question_lsh_bands qlb
      JOIN question_fingerprints qf ON qlb.question_id = qf.question_id
      WHERE qlb.block_id = ? AND qlb.band_key IN (${placeholders})
      GROUP BY qlb.question_id
      ORDER BY hit_count DESC
      LIMIT ?
    `;

    const params: unknown[] = [blockId, ...bandKeys, limit];
    const res = await this.db.prepare(sql).bind(...params).all<FingerprintRow>();

    return (res.results || []).map((r) => this.mapRowToFingerprint(r));
  }

  public async upsert(fingerprint: QuestionFingerprint): Promise<Result<void, QddError>> {
    try {
      const minhashBytes = new Uint8Array(
        fingerprint.minhash.buffer,
        fingerprint.minhash.byteOffset,
        fingerprint.minhash.byteLength
      );

      const insertFpSql = `
        INSERT INTO question_fingerprints (
          question_id, block_id, chapter_id, topic_id, editorial_status,
          normalizer_version, stem_hash, item_hash, answer_key_hash,
          minhash, discriminators_json, embedding_model, embedded_at,
          content_version, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(question_id) DO UPDATE SET
          editorial_status = excluded.editorial_status,
          normalizer_version = excluded.normalizer_version,
          stem_hash = excluded.stem_hash,
          item_hash = excluded.item_hash,
          answer_key_hash = excluded.answer_key_hash,
          minhash = excluded.minhash,
          discriminators_json = excluded.discriminators_json,
          embedding_model = excluded.embedding_model,
          embedded_at = excluded.embedded_at,
          content_version = excluded.content_version,
          updated_at = datetime('now')
      `;

      await this.db.prepare(insertFpSql).bind(
        fingerprint.questionId,
        fingerprint.blockId,
        fingerprint.chapterId,
        'general', // topic_id fallback
        'published',
        fingerprint.normalizerVersion,
        fingerprint.stemHash,
        fingerprint.itemHash,
        fingerprint.answerKeyHash,
        minhashBytes,
        JSON.stringify(fingerprint.discriminators),
        fingerprint.embeddingModel,
        fingerprint.embeddedAt,
        fingerprint.contentVersion
      ).run();

      // Upsert LSH bands
      if (fingerprint.lshBands.length > 0) {
        await this.db
          .prepare('DELETE FROM question_lsh_bands WHERE question_id = ?')
          .bind(fingerprint.questionId)
          .run();

        for (const bk of fingerprint.lshBands) {
          await this.db
            .prepare(
              'INSERT OR IGNORE INTO question_lsh_bands (question_id, block_id, band_key) VALUES (?, ?, ?)'
            )
            .bind(fingerprint.questionId, fingerprint.blockId, bk)
            .run();
        }
      }

      return ok(undefined);
    } catch (err_: any) {
      return err({
        code: 'STORAGE_FAILURE',
        message: `D1 Fingerprint upsert failed: ${err_?.message || String(err_)}`,
      });
    }
  }

  public async remove(questionId: string): Promise<Result<void, QddError>> {
    try {
      await this.db.prepare('DELETE FROM question_lsh_bands WHERE question_id = ?').bind(questionId).run();
      await this.db.prepare('DELETE FROM question_fingerprints WHERE question_id = ?').bind(questionId).run();
      return ok(undefined);
    } catch (err_: any) {
      return err({
        code: 'STORAGE_FAILURE',
        message: `D1 Fingerprint remove failed: ${err_?.message || String(err_)}`,
      });
    }
  }
}
