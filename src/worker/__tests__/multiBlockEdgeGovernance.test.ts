/**
 * Edge Governance & Multi-Block D1 Integration Test (US5 & US6)
 * SPEC-010 Phase 8: Faculty Studio, Ingestion Lab & Edge Block Registry
 *
 * Verifies:
 * 1. D1 migration 0007 executes and seeds curriculum_blocks ('cvs' published, 'cns' beta).
 * 2. EdgeBlockGuard enforces 404 on unknown blocks, 403 on unauthorized roles for beta blocks,
 *    and 409 on archived blocks.
 * 3. GET /api/v1/blocks and /api/blocks filter beta blocks from students and expose them to faculty/admin.
 * 4. Worker endpoints (/api/bank/sync, /api/bank/submissions, /api/qdd/check) reject unknown blocks with 404.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import worker from '../index.ts';
import { EdgeBlockGuard } from '../curriculum/EdgeBlockGuard.ts';
import type { BlockId } from '../../domain/curriculum/ids.ts';

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

describe('Multi-Block Edge Governance & D1 Block Registry (US6)', () => {
  let sqlite: DatabaseSync;
  let d1: ReturnType<typeof createTestD1Database>;
  let env: any;

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:');
    d1 = createTestD1Database(sqlite);

    // Load and execute migrations in order: 0003 -> 0006 -> 0007
    const mig0003Path = path.resolve(process.cwd(), 'src/worker/migrations/0003_global_questions_bank.sql');
    const mig0006Path = path.resolve(process.cwd(), 'src/worker/migrations/0006_question_duplication_engine.sql');
    const mig0007Path = path.resolve(process.cwd(), 'src/worker/migrations/0007_curriculum_blocks.sql');

    sqlite.exec(fs.readFileSync(mig0003Path, 'utf8'));
    sqlite.exec(fs.readFileSync(mig0006Path, 'utf8'));
    sqlite.exec(fs.readFileSync(mig0007Path, 'utf8'));

    env = {
      MED_QUESTS_DB: d1,
    };
  });

  describe('D1 Migration 0007 Seeding', () => {
    it('seeds canonical blocks (cvs as published, cns as beta)', () => {
      const rows = sqlite.prepare('SELECT id, code, short_name, name_en, name_ar, status, catalog_order FROM curriculum_blocks ORDER BY catalog_order ASC').all() as any[];

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        id: 'cvs',
        code: 'Block 206',
        short_name: 'CVS',
        status: 'published',
        catalog_order: 1,
      });
      expect(rows[1]).toMatchObject({
        id: 'cns',
        code: 'Block 207',
        short_name: 'CNS',
        status: 'beta',
        catalog_order: 2,
      });
    });

    it('initializes revision cursor in bank_revisions for CNS block', () => {
      const row = sqlite.prepare('SELECT block_id, revision_number FROM bank_revisions WHERE block_id = ?').get('cns') as any;
      expect(row).toBeDefined();
      expect(row.revision_number).toBe(1);
    });
  });

  describe('EdgeBlockGuard', () => {
    let guard: EdgeBlockGuard;

    beforeEach(() => {
      guard = new EdgeBlockGuard(d1);
    });

    it('validates known blocks and defaults cleanly', async () => {
      const cvs = await guard.requireKnownBlock('cvs');
      expect(cvs.ok).toBe(true);
      if (cvs.ok) {
        expect(cvs.blockId).toBe('cvs');
        expect(cvs.status).toBe('published');
      }

      const cns = await guard.requireKnownBlock('cns');
      expect(cns.ok).toBe(true);
      if (cns.ok) {
        expect(cns.blockId).toBe('cns');
        expect(cns.status).toBe('beta');
      }

      // Null or empty defaults to legacy cvs
      const defaulted = await guard.requireKnownBlock(null);
      expect(defaulted.ok).toBe(true);
      if (defaulted.ok) {
        expect(defaulted.blockId).toBe('cvs');
      }
    });

    it('rejects unknown blocks with 404', async () => {
      const unknown = await guard.requireKnownBlock('unknownblock');
      expect(unknown.ok).toBe(false);
      if (!unknown.ok) {
        expect(unknown.response.status).toBe(404);
        const body = await unknown.response.json();
        expect(body.error).toContain("Unknown curriculum block 'unknownblock'");
      }
    });

    it('rejects malformed block slugs with 400', async () => {
      const invalid = await guard.requireKnownBlock('INVALID_SLUG_1234567890');
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) {
        expect(invalid.response.status).toBe(400);
      }
    });

    it('allows faculty and admin to author questions in beta blocks, but rejects students with 403', async () => {
      const adminWrite = await guard.requireWritableBlock('cns' as BlockId, 'admin');
      expect(adminWrite.ok).toBe(true);

      const facultyWrite = await guard.requireWritableBlock('cns' as BlockId, 'faculty-reviewer');
      expect(facultyWrite.ok).toBe(true);

      const studentWrite = await guard.requireWritableBlock('cns' as BlockId, 'student-pro');
      expect(studentWrite.ok).toBe(false);
      if (!studentWrite.ok) {
        expect(studentWrite.response.status).toBe(403);
      }
    });

    it('rejects writes to archived blocks with 409 Conflict', async () => {
      sqlite.prepare("UPDATE curriculum_blocks SET status = 'archived' WHERE id = 'cns'").run();

      const write = await guard.requireWritableBlock('cns' as BlockId, 'admin');
      expect(write.ok).toBe(false);
      if (!write.ok) {
        expect(write.response.status).toBe(409);
        const body = await write.response.json();
        expect(body.error).toContain("archived and immutable");
      }
    });
  });

  describe('Worker Route: GET /api/v1/blocks', () => {
    it('returns only published blocks for students (hiding beta blocks like CNS)', async () => {
      const req = new Request('https://medquests.internal/api/v1/blocks', {
        headers: { 'x-user-role': 'student-pro' },
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.blocks).toBeDefined();
      expect(data.blocks.map((b: any) => b.id)).toEqual(['cvs']);
    });

    it('reveals beta blocks to faculty and administrators', async () => {
      const facultyReq = new Request('https://medquests.internal/api/v1/blocks', {
        headers: { 'x-user-role': 'faculty-reviewer' },
      });
      const facultyRes = await worker.fetch(facultyReq, env);
      expect(facultyRes.status).toBe(200);

      const facultyData = await facultyRes.json();
      expect(facultyData.blocks.map((b: any) => b.id)).toEqual(['cvs', 'cns']);

      const adminReq = new Request('https://medquests.internal/api/v1/blocks', {
        headers: { 'x-user-role': 'admin' },
      });
      const adminRes = await worker.fetch(adminReq, env);
      expect(adminRes.status).toBe(200);

      const adminData = await adminRes.json();
      expect(adminData.blocks.map((b: any) => b.id)).toEqual(['cvs', 'cns']);
    });
  });

  describe('Worker Edge Block Guard on API Routes', () => {
    it('returns 404 on GET /api/bank/sync when block is unknown', async () => {
      const req = new Request('https://medquests.internal/api/bank/sync?block=unknownblock');
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Unknown curriculum block 'unknownblock'");
    });

    it('returns 200 on GET /api/bank/sync for known block', async () => {
      const req = new Request('https://medquests.internal/api/bank/sync?block=cvs');
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it('returns 404 on GET /api/bank/submissions with unknown block parameter', async () => {
      const req = new Request('https://medquests.internal/api/bank/submissions?block=unknownblock', {
        headers: {
          'x-user-role': 'faculty-reviewer',
          'origin': 'https://medquests.internal',
        },
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it('returns 404 on POST /api/qdd/check with unknown block parameter', async () => {
      const req = new Request('https://medquests.internal/api/qdd/check?block=unknownblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'origin': 'https://medquests.internal',
        },
        body: JSON.stringify({
          question: {
            id: 'q-test-unknown-1',
            blockId: 'unknownblock',
            subjectId: 'anatomy',
            chapterId: 'ch-unknown',
            topicId: 'top-unknown',
            concept: 'Unknown Concept',
            type: 'single-best-answer',
            stem: 'A 50-year-old patient presents with symptoms for duplication check.',
            choices: [
              { id: 'a', text: 'Option A', isCorrect: true, rationale: 'Rationale A' },
              { id: 'b', text: 'Option B', isCorrect: false, rationale: 'Rationale B' },
              { id: 'c', text: 'Option C', isCorrect: false, rationale: 'Rationale C' },
              { id: 'd', text: 'Option D', isCorrect: false, rationale: 'Rationale D' },
            ],
            explanation: 'Detailed explanation for test.',
            examTip: null,
            mnemonic: null,
            difficulty: 2,
            cognitiveLevel: 'understanding',
            highYield: true,
            origin: 'authored-grounded',
            evidence: [
              { chunkId: 'c1', sourceName: 'Book', location: 'p1', quote: 'A valid quote >= 10 chars', kind: 'text' },
            ],
            status: 'active',
            bankVersion: 1,
          },
          scope: {
            kind: 'block',
            blockId: 'unknownblock',
          },
        }),
      });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Unknown curriculum block 'unknownblock'");
    });
  });
});
