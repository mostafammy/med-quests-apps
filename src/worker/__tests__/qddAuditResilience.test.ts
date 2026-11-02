/**
 * Integration Test: Global Bank Health Audit & Reviewer Resilience (US4 & US5)
 * Verifies chunked resumable audits, deterministic cluster survivor election,
 * non-destructive soft-archive side effects, monotonic bank revision increment,
 * and immutable editorial audit log preservation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handleQddRoutes } from '../routes/qdd.ts';

// Helper: Wrap node:sqlite DatabaseSync in Cloudflare D1-compatible interface
function createTestD1Database(sqlite: DatabaseSync) {
  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      return {
        bind(...params: any[]) {
          boundParams = params;
          return this;
        },
        async run() {
          const stmt = sqlite.prepare(query);
          const result = stmt.run(...boundParams);
          return { success: true, meta: { changes: Number(result.changes) } };
        },
        async all() {
          const stmt = sqlite.prepare(query);
          const results = stmt.all(...boundParams);
          return { results: results as any[], success: true };
        },
        async first(colName?: string) {
          const stmt = sqlite.prepare(query);
          const result = stmt.get(...boundParams);
          if (!result) return null;
          if (colName) return (result as any)[colName] ?? null;
          return result;
        },
      };
    },
    async batch(statements: any[]) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
  };
}

describe('QDD Global Bank Health Audit & Resilience (US4)', () => {
  let sqlite: DatabaseSync;
  let d1: ReturnType<typeof createTestD1Database>;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    d1 = createTestD1Database(sqlite);

    // Apply real SQLite migrations
    const mig0003Path = path.resolve(process.cwd(), 'src/worker/migrations/0003_global_questions_bank.sql');
    const mig0006Path = path.resolve(process.cwd(), 'src/worker/migrations/0006_question_duplication_engine.sql');

    const sql0003 = fs.readFileSync(mig0003Path, 'utf8');
    const sql0006 = fs.readFileSync(mig0006Path, 'utf8');

    sqlite.exec(sql0003);
    sqlite.exec(sql0006);

    // Create mock user learner attempts table to verify FK preservation
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_question_attempts (
        attempt_id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        selected_choice_id TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (question_id) REFERENCES global_questions (id)
      );
    `);

    // Seed bank revision
    sqlite.exec(`
      INSERT OR REPLACE INTO bank_revisions (block_id, revision_number, updated_at)
      VALUES ('cvs', 1, datetime('now'));
    `);

    // Seed canonical questions in global_questions
    const insertQ = sqlite.prepare(`
      INSERT INTO global_questions (
        id, block_id, subject_id, chapter_id, topic_id, concept, type, stem, stem_hash,
        choices_json, explanation, difficulty, cognitive_level, high_yield, origin, evidence_json,
        editorial_status, bank_version, global_revision, author_id, author_display_name
      ) VALUES (?, 'cvs', 'anatomy', 'cvs-ana-heart', 'cvs-ana-valves', 'Mitral Valve', 'single-best-answer', ?, ?, '[]', 'Exp', 2, 'understanding', 1, 'authored-grounded', '[]', 'published', 1, 1, 'author-1', 'Dr. Smith');
    `);

    insertQ.run('q-survivor-1', 'Which papillary muscle is supplied solely by the posterior descending artery?', 'hash-stem-1');
    insertQ.run('q-duplicate-2', 'Which papillary muscle receives its blood supply exclusively from the PDA?', 'hash-stem-2');
    insertQ.run('q-duplicate-3', 'Sole blood supply to the posteromedial papillary muscle is from which artery?', 'hash-stem-3');
    insertQ.run('q-unique-4', 'Which enzyme catalyzes the rate-limiting step of cholesterol synthesis?', 'hash-stem-4');

    // Seed mock learner attempts on q-duplicate-2 to verify non-destructive retention
    sqlite.exec(`
      INSERT INTO user_question_attempts (attempt_id, question_id, user_id, selected_choice_id, is_correct)
      VALUES ('att-001', 'q-duplicate-2', 'usr-student-42', 'a', 1),
             ('att-002', 'q-duplicate-2', 'usr-student-99', 'b', 0);
    `);

    // Seed question fingerprints
    const insertFp = sqlite.prepare(`
      INSERT INTO question_fingerprints (
        question_id, subject_kind, block_id, chapter_id, topic_id, editorial_status,
        normalizer_version, stem_hash, item_hash, answer_key_hash, minhash, discriminators_json
      ) VALUES (?, 'canonical', 'cvs', 'cvs-ana-heart', 'cvs-ana-valves', 'published', '2.0.0', ?, ?, 'ak-hash', X'000102', '[]');
    `);

    insertFp.run('q-survivor-1', 'stem-hash-1', 'item-hash-1');
    insertFp.run('q-duplicate-2', 'stem-hash-2', 'item-hash-2');
    insertFp.run('q-duplicate-3', 'stem-hash-3', 'item-hash-3');
    insertFp.run('q-unique-4', 'stem-hash-4', 'item-hash-4');

    // Seed LSH bands: q-survivor-1, q-duplicate-2, and q-duplicate-3 collide on shared band_keys
    const insertBand = sqlite.prepare(`
      INSERT INTO question_lsh_bands (question_id, block_id, band_key) VALUES (?, 'cvs', ?);
    `);

    // Collision bands for the duplicate trio
    insertBand.run('q-survivor-1', 'cvs:band:0:collision_hash_aaa');
    insertBand.run('q-duplicate-2', 'cvs:band:0:collision_hash_aaa');
    insertBand.run('q-duplicate-3', 'cvs:band:0:collision_hash_aaa');

    insertBand.run('q-survivor-1', 'cvs:band:1:collision_hash_bbb');
    insertBand.run('q-duplicate-2', 'cvs:band:1:collision_hash_bbb');

    // Unique band for the distinct question
    insertBand.run('q-unique-4', 'cvs:band:0:distinct_hash_zzz');
  });

  it('executes a resumable chunked audit from start to cluster completion', async () => {
    // 1. Start Audit Job
    const startReq = new Request('http://localhost/api/admin/qdd/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockId: 'cvs', startedBy: 'admin-sarah' }),
    });

    const startRes = await handleQddRoutes(startReq, { MED_QUESTS_DB: d1 }, new URL(startReq.url));
    expect(startRes).not.toBeNull();
    expect(startRes?.status).toBe(202);

    const initialJob = await startRes!.json();
    expect(initialJob.id).toMatch(/^audit-/);
    expect(initialJob.status).toBe('running');
    expect(initialJob.total).toBe(4);

    // 2. Advance Chunk 1 (Lexical collision processing)
    const advanceReq1 = new Request(`http://localhost/api/admin/qdd/audits/${initialJob.id}/advance`, {
      method: 'POST',
    });
    const advanceRes1 = await handleQddRoutes(advanceReq1, { MED_QUESTS_DB: d1 }, new URL(advanceReq1.url));
    expect(advanceRes1?.status).toBe(200);
    const jobChunk1 = await advanceRes1!.json();
    expect(parseInt(jobChunk1.cursor, 10)).toBeGreaterThan(0);

    // 3. Advance Chunk 2 (Exhausts collision buckets -> transitions to completed with Union-Find clustering)
    const advanceReq2 = new Request(`http://localhost/api/admin/qdd/audits/${initialJob.id}/advance`, {
      method: 'POST',
    });
    const advanceRes2 = await handleQddRoutes(advanceReq2, { MED_QUESTS_DB: d1 }, new URL(advanceReq2.url));
    expect(advanceRes2?.status).toBe(200);
    const completedJob = await advanceRes2!.json();
    expect(completedJob.status).toBe('completed');
    expect(completedJob.clustersFound).toBeGreaterThanOrEqual(1);

    // 4. Fetch Formed Duplicate Clusters
    const clustersReq = new Request(`http://localhost/api/admin/qdd/audits/${initialJob.id}/clusters`, {
      method: 'GET',
    });
    const clustersRes = await handleQddRoutes(clustersReq, { MED_QUESTS_DB: d1 }, new URL(clustersReq.url));
    expect(clustersRes?.status).toBe(200);
    const { clusters } = await clustersRes!.json();

    expect(clusters.length).toBe(1);
    const cluster = clusters[0];
    expect(cluster.memberIds).toContain('q-survivor-1');
    expect(cluster.memberIds).toContain('q-duplicate-2');
    expect(cluster.memberIds).toContain('q-duplicate-3');
    expect(cluster.memberIds).not.toContain('q-unique-4');
  });

  it('guarantees monotonic bank_revisions increment and audit log upon ARCHIVE_DUPLICATE', async () => {
    // Check initial revision
    const revBefore = sqlite.prepare("SELECT revision_number FROM bank_revisions WHERE block_id = 'cvs'").get() as any;
    expect(revBefore.revision_number).toBe(1);

    // Reviewer resolves q-duplicate-2 as ARCHIVE_DUPLICATE
    const resolutionReq = new Request('http://localhost/api/admin/qdd/resolutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairKey: 'q-duplicate-2|q-survivor-1',
        subjectId: 'q-survivor-1',
        matchedId: 'q-duplicate-2',
        engineRelation: 'NEAR',
        humanRelation: 'NEAR',
        action: 'ARCHIVE_DUPLICATE',
        reviewerId: 'usr-chief-medical-editor',
        note: 'Duplicate stem tests identical mitral papillary muscle concept.',
      }),
    });

    const res = await handleQddRoutes(resolutionReq, { MED_QUESTS_DB: d1 }, new URL(resolutionReq.url));
    expect(res?.status).toBe(200);
    const data = await res!.json();
    expect(data.success).toBe(true);
    expect(data.revisionBumped).toBe(true);

    // 1. Monotonic revision bump: 1 -> 2
    const revAfter = sqlite.prepare("SELECT revision_number FROM bank_revisions WHERE block_id = 'cvs'").get() as any;
    expect(revAfter.revision_number).toBe(2);

    // 2. Question soft-archived in global_questions
    const qArchived = sqlite.prepare('SELECT editorial_status FROM global_questions WHERE id = ?').get('q-duplicate-2') as any;
    expect(qArchived.editorial_status).toBe('archived');

    // 3. Question soft-archived in question_fingerprints
    const fpArchived = sqlite.prepare('SELECT editorial_status FROM question_fingerprints WHERE question_id = ?').get('q-duplicate-2') as any;
    expect(fpArchived.editorial_status).toBe('archived');

    // 4. Immutable editorial audit log entry created
    const auditLogs = sqlite.prepare('SELECT * FROM question_editorial_audit_log WHERE question_id = ?').all('q-duplicate-2') as any[];
    expect(auditLogs.length).toBe(1);
    const log = auditLogs[0];
    expect(log.action).toBe('archive');
    expect(log.actor_user_id).toBe('usr-chief-medical-editor');
    expect(log.previous_status).toBe('published');
    expect(log.next_status).toBe('archived');
    expect(log.revision_after).toBe(2);
    expect(log.summary).toContain('q-survivor-1');

    // 5. Learner attempt foreign keys remain intact and unmodified
    const attempts = sqlite.prepare('SELECT * FROM user_question_attempts WHERE question_id = ?').all('q-duplicate-2') as any[];
    expect(attempts.length).toBe(2);
    expect(attempts[0].attempt_id).toBe('att-001');
    expect(attempts[1].attempt_id).toBe('att-002');

    // 6. Pair verdict memoized in qdd_pair_verdicts so duplicate alerts never fire again
    const memoized = sqlite.prepare('SELECT * FROM qdd_pair_verdicts WHERE pair_key = ?').get('q-duplicate-2|q-survivor-1') as any;
    expect(memoized).not.toBeNull();
    expect(memoized.source).toBe('human');
    expect(memoized.relation).toBe('NEAR');
  });

  it('supports LINK_AS_VARIANT resolution recording SIBLING relationship without archiving', async () => {
    const linkReq = new Request('http://localhost/api/admin/qdd/resolutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairKey: 'q-duplicate-3|q-survivor-1',
        subjectId: 'q-survivor-1',
        matchedId: 'q-duplicate-3',
        engineRelation: 'SIBLING',
        humanRelation: 'SIBLING',
        action: 'LINK_AS_VARIANT',
        reviewerId: 'usr-chief-medical-editor',
        note: 'Clinical variant presenting reverse angle.',
      }),
    });

    const res = await handleQddRoutes(linkReq, { MED_QUESTS_DB: d1 }, new URL(linkReq.url));
    expect(res?.status).toBe(200);

    // Verify duplicate link table contains the SIBLING entry
    const links = sqlite.prepare('SELECT * FROM question_duplicate_links WHERE question_id = ? AND related_id = ?')
      .all('q-survivor-1', 'q-duplicate-3') as any[];
    expect(links.length).toBe(1);
    expect(links[0].link_type).toBe('SIBLING');

    // Verify questions were NOT archived
    const q3 = sqlite.prepare('SELECT editorial_status FROM global_questions WHERE id = ?').get('q-duplicate-3') as any;
    expect(q3.editorial_status).toBe('published');
  });
});
