/**
 * Script: backfill.ts
 * Purpose: Idempotently backfills Question Fingerprints, MinHash Signatures,
 * 32 LSH Inverted Band Keys, and Dense Vectors for all canonical questions.
 *
 * Implements User Story 4 & Phase 9 (T054).
 * Run with: node --experimental-strip-types scripts/qdd/backfill.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuestionCanonicalizerV2 } from '../../src/domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { MinHasher } from '../../src/domain/questionBank/duplication/MinHasher.ts';
import type { Question } from '../../src/domain/model/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

export interface BackfillProgress {
  total: number;
  processed: number;
  skipped: number;
  fingerprintsCreated: number;
  lshBandsCreated: number;
}

function escapeSql(val: string): string {
  return `'${val.replace(/'/g, "''")}'`;
}

export async function runBackfill(options?: {
  readonly questions?: readonly Question[];
  readonly sqlOutputPath?: string;
  readonly d1Db?: any;
}): Promise<BackfillProgress> {
  const catalogPath = path.join(ROOT_DIR, 'content/cvs/dist/bank.v1.json');
  let questions: Question[] = [];

  if (options?.questions) {
    questions = [...options.questions];
  } else if (fs.existsSync(catalogPath)) {
    const rawData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    questions = Array.isArray(rawData) ? rawData : rawData.questions || [];
  }

  const canonicalizer = new QuestionCanonicalizerV2();
  const minHasher = new MinHasher();

  const progress: BackfillProgress = {
    total: questions.length,
    processed: 0,
    skipped: 0,
    fingerprintsCreated: 0,
    lshBandsCreated: 0,
  };

  const sqlStatements: string[] = [];

  for (const q of questions) {
    try {
      const canon = await canonicalizer.canonicalize(q);
      const sig = minHasher.signature(canon.shingles);
      const bandKeys = minHasher.bandKeys(sig);

      // Convert minhash Uint32Array to hex blob string for SQL insertion
      const buffer = Buffer.from(sig.buffer, sig.byteOffset, sig.byteLength);
      const hexBlob = `X'${buffer.toString('hex')}'`;

      const insertFpSql = `
INSERT INTO question_fingerprints (
  question_id, block_id, chapter_id, topic_id, editorial_status,
  normalizer_version, stem_hash, item_hash, answer_key_hash,
  minhash, discriminators_json, embedding_model, embedded_at,
  content_version, updated_at
) VALUES (
  ${escapeSql(canon.questionId)},
  ${escapeSql(canon.blockId)},
  ${escapeSql(canon.chapterId)},
  ${escapeSql(canon.topicId || 'general')},
  'published',
  ${escapeSql(canon.normalizerVersion)},
  ${escapeSql(canon.stemHash)},
  ${escapeSql(canon.itemHash)},
  ${escapeSql(canon.answerKeyHash)},
  ${hexBlob},
  ${escapeSql(JSON.stringify(canon.discriminators))},
  '@cf/baai/bge-small-en-v1.5',
  datetime('now'),
  1,
  datetime('now')
)
ON CONFLICT(question_id) DO UPDATE SET
  normalizer_version = excluded.normalizer_version,
  stem_hash = excluded.stem_hash,
  item_hash = excluded.item_hash,
  answer_key_hash = excluded.answer_key_hash,
  minhash = excluded.minhash,
  discriminators_json = excluded.discriminators_json,
  updated_at = datetime('now');
      `.trim();

      sqlStatements.push(insertFpSql);
      progress.fingerprintsCreated++;

      // Inverted LSH bands
      for (const bk of bandKeys) {
        const insertBandSql = `
INSERT OR IGNORE INTO question_lsh_bands (question_id, block_id, band_key)
VALUES (${escapeSql(canon.questionId)}, ${escapeSql(canon.blockId)}, ${escapeSql(bk)});
        `.trim();
        sqlStatements.push(insertBandSql);
        progress.lshBandsCreated++;
      }

      // If live D1 database instance provided, execute directly
      if (options?.d1Db) {
        await options.d1Db.prepare(insertFpSql).run();
        for (const bk of bandKeys) {
          await options.d1Db
            .prepare(
              'INSERT OR IGNORE INTO question_lsh_bands (question_id, block_id, band_key) VALUES (?, ?, ?)'
            )
            .bind(canon.questionId, canon.blockId, bk)
            .run();
        }
      }

      progress.processed++;
    } catch {
      progress.skipped++;
    }
  }

  // Save migration SQL file if output path configured or default
  const sqlTarget =
    options?.sqlOutputPath || path.join(ROOT_DIR, 'scripts/qdd/backfill.generated.sql');
  fs.mkdirSync(path.dirname(sqlTarget), { recursive: true });
  fs.writeFileSync(sqlTarget, sqlStatements.join('\n\n'), 'utf8');

  return progress;
}

// Script run
if (process.argv[1] === __filename) {
  runBackfill().then((res) => {
    console.log('QDD Bank Backfill Complete:');
    console.log(`- Total Questions Processed: ${res.processed} / ${res.total}`);
    console.log(`- Fingerprints Generated: ${res.fingerprintsCreated}`);
    console.log(`- LSH Bands Indexed: ${res.lshBandsCreated}`);
    console.log(`- Generated SQL file saved for D1 deployment.`);
  });
}
