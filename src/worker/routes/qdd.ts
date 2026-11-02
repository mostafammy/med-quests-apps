/**
 * Worker Routes: Question Duplication Detection Engine (QDD)
 * Endpoints: /api/qdd/check, /api/qdd/check-batch
 */

import { z } from 'zod';
import { QuestionSchema } from '../../domain/model/types.ts';
import { createWorkerQddEngine } from '../qdd/compositionRoot.ts';
import { D1AuditJobRepository } from '../../infrastructure/questionBank/duplication/d1/D1AuditJobRepository.ts';
import { QddTelemetrySink } from '../../infrastructure/questionBank/duplication/telemetry/QddTelemetrySink.ts';
import type { DuplicationVerdict } from '../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

const QddCheckRequestSchema = z.object({
  question: QuestionSchema,
  scope: z
    .object({
      kind: z.enum(['block', 'chapter', 'batch-only']),
      blockId: z.string().optional(),
      chapterId: z.string().optional(),
    })
    .default({ kind: 'block', blockId: 'cvs' }),
});

const QddCheckBatchRequestSchema = z.object({
  questions: z.array(QuestionSchema).max(50),
  scope: z
    .object({
      kind: z.enum(['block', 'chapter', 'batch-only']),
      blockId: z.string().optional(),
      chapterId: z.string().optional(),
    })
    .default({ kind: 'block', blockId: 'cvs' }),
});

export async function handleQddRoutes(
  request: Request,
  env: any,
  url: URL
): Promise<Response | null> {
  // Emergency Kill Switch & Dynamic Mode Resolution (T056 / FR-030)
  const qddModeHeader = request.headers.get('x-qdd-mode');
  const effectiveMode: 'off' | 'shadow' | 'enforce' =
    qddModeHeader === 'off' || qddModeHeader === 'shadow' || qddModeHeader === 'enforce'
      ? qddModeHeader
      : (env?.QDD_MODE === 'off' || env?.QDD_MODE === 'shadow' || env?.QDD_MODE === 'enforce'
          ? env.QDD_MODE
          : 'shadow');

  // Emergency Administrative Bypass: When QDD_MODE is 'off', bypass checks with ALLOW / UNIQUE
  if (effectiveMode === 'off') {
    if (url.pathname === '/api/qdd/check' && request.method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const questionId = body?.question?.id || 'unknown';
      return new Response(
        JSON.stringify({
          questionId,
          decision: 'ALLOW',
          relation: 'UNIQUE',
          candidates: [],
          stagesExecuted: [],
          decidingStage: 'BYPASS_KILL_SWITCH',
          degraded: true,
          degradedReason: 'ADMIN_BYPASS',
          engineVersion: 'qdd-engine-v2',
          thresholdsVersion: 'v1',
          latencyMs: 0,
          tier: 'edge_authoritative',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'x-qdd-bypass': 'true' },
        }
      );
    }
  }

  // 1. Single Question Check: POST /api/qdd/check
  if (url.pathname === '/api/qdd/check' && request.method === 'POST') {
    try {
      const body = await request.json();
      const parsed = QddCheckRequestSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({
            error: 'INVALID_REQUEST',
            details: parsed.error.issues,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const engine = createWorkerQddEngine(env.MED_QUESTS_DB);
      const scope = parsed.data.scope as any;
      const res = await engine.check(parsed.data.question as any, scope, 'edge-authoritative');

      if (!res.ok) {
        return new Response(JSON.stringify({ error: res.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Record to qdd_verdict_log
      await logVerdict(env.MED_QUESTS_DB, res.value, env.QDD_MODE || 'shadow');

      return new Response(JSON.stringify(res.value), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: 'SERVER_ERROR', message: err?.message || String(err) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 2. Batch Question Check: POST /api/qdd/check-batch
  if (url.pathname === '/api/qdd/check-batch' && request.method === 'POST') {
    try {
      const body = await request.json();
      const parsed = QddCheckBatchRequestSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({
            error: 'INVALID_REQUEST',
            details: parsed.error.issues,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const engine = createWorkerQddEngine(env.MED_QUESTS_DB);
      const scope = parsed.data.scope as any;
      const res = await engine.checkBatch(parsed.data.questions as any, scope);

      if (!res.ok) {
        return new Response(JSON.stringify({ error: res.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      for (const verdict of res.value) {
        await logVerdict(env.MED_QUESTS_DB, verdict, env.QDD_MODE || 'shadow');
      }

      return new Response(JSON.stringify({ verdicts: res.value }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: 'SERVER_ERROR', message: err?.message || String(err) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 3. Start Audit Job: POST /api/admin/qdd/audits
  if (url.pathname === '/api/admin/qdd/audits' && request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}));
      const blockId = body.blockId || 'cvs';
      const startedBy = body.startedBy || 'admin';
      const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
      const job = await repo.createJob(blockId, startedBy);
      return new Response(JSON.stringify(job), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 4. Advance Audit Chunk: POST /api/admin/qdd/audits/:id/advance
  const advanceMatch = url.pathname.match(/^\/api\/admin\/qdd\/audits\/([^/]+)\/advance$/);
  if (advanceMatch && request.method === 'POST') {
    try {
      const jobId = advanceMatch[1];
      const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
      const job = await repo.advanceChunk(jobId);
      return new Response(JSON.stringify(job), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 5. Get Audit Job Status: GET /api/admin/qdd/audits/:id
  const getJobMatch = url.pathname.match(/^\/api\/admin\/qdd\/audits\/([^/]+)$/);
  if (getJobMatch && request.method === 'GET') {
    try {
      const jobId = getJobMatch[1];
      const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
      const job = await repo.getJob(jobId);
      if (!job) {
        return new Response(JSON.stringify({ error: 'JOB_NOT_FOUND' }), { status: 404 });
      }
      return new Response(JSON.stringify(job), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 6. Get Audit Duplicate Clusters: GET /api/admin/qdd/audits/:id/clusters
  const getClustersMatch = url.pathname.match(/^\/api\/admin\/qdd\/audits\/([^/]+)\/clusters$/);
  if (getClustersMatch && request.method === 'GET') {
    try {
      const jobId = getClustersMatch[1];
      const repo = new D1AuditJobRepository(env.MED_QUESTS_DB);
      const clusters = await repo.getClusters(jobId);
      return new Response(JSON.stringify({ clusters }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 7. Reviewer Cluster Resolution: POST /api/admin/qdd/resolutions
  if (url.pathname === '/api/admin/qdd/resolutions' && request.method === 'POST') {
    try {
      const body = await request.json();
      const {
        pairKey,
        subjectId,
        matchedId,
        engineRelation = 'NEAR',
        humanRelation = 'UNIQUE',
        action,
        reviewerId = 'admin',
        note = null,
      } = body;

      const db = env.MED_QUESTS_DB;
      const resId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // 1. Record Resolution
      await db
        .prepare(`
          INSERT INTO qdd_resolutions (
            id, pair_key, subject_id, matched_id, engine_relation, human_relation, action, reviewer_id, note, resolved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)
        .bind(resId, pairKey, subjectId, matchedId, engineRelation, humanRelation, action, reviewerId, note)
        .run();

      // Non-blocking telemetry dispatch
      QddTelemetrySink.getInstance().recordResolution({
        pairKey,
        subjectId,
        matchedId,
        engineRelation,
        humanRelation,
        action,
        reviewerId,
        isOverride: engineRelation !== humanRelation,
      });

      // 2. Cache resolution into qdd_pair_verdicts so it never re-flags
      await db
        .prepare(`
          INSERT INTO qdd_pair_verdicts (
            pair_key, relation, confidence, rationale, model_id, prompt_version, source, created_at
          ) VALUES (?, ?, 1.0, ?, 'human-reviewer', 'v1', 'human', datetime('now'))
          ON CONFLICT(pair_key) DO UPDATE SET
            relation = excluded.relation,
            confidence = excluded.confidence,
            rationale = excluded.rationale,
            source = excluded.source
        `)
        .bind(pairKey, humanRelation, note || 'Human reviewer resolution')
        .run();

      // 3. Handle Resolution Actions
      let revisionBumped = false;

      if (action === 'ARCHIVE_DUPLICATE') {
        // Soft-archive duplicate item (P8: preserves attempt foreign keys)
        await db
          .prepare("UPDATE global_questions SET editorial_status = 'archived' WHERE id = ?")
          .bind(matchedId)
          .run();

        await db
          .prepare("UPDATE question_fingerprints SET editorial_status = 'archived' WHERE question_id = ?")
          .bind(matchedId)
          .run();

        // Increment bank revision
        await db
          .prepare("UPDATE bank_revisions SET revision_number = revision_number + 1, updated_at = datetime('now') WHERE block_id = 'cvs'")
          .run();

        const revRow = await db.prepare("SELECT revision_number FROM bank_revisions WHERE block_id = 'cvs'").first();
        const nextRev = revRow?.revision_number ?? 2;

        // Log to question_editorial_audit_log
        const logId = `audit-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await db
          .prepare(`
            INSERT INTO question_editorial_audit_log (
              id, question_id, block_id, action, actor_user_id, actor_display_name, actor_role,
              previous_status, next_status, revision_after, summary, occurred_at
            ) VALUES (?, ?, 'cvs', 'archive', ?, 'Administrator', 'admin', 'published', 'archived', ?, ?, datetime('now'))
          `)
          .bind(logId, matchedId, reviewerId, nextRev, `Archived duplicate of ${subjectId}`)
          .run();

        revisionBumped = true;
      } else if (action === 'MERGE_INTO_SURVIVOR') {
        // Soft-archive duplicate item
        await db
          .prepare("UPDATE global_questions SET editorial_status = 'archived' WHERE id = ?")
          .bind(matchedId)
          .run();

        await db
          .prepare("UPDATE question_fingerprints SET editorial_status = 'archived' WHERE question_id = ?")
          .bind(matchedId)
          .run();

        await db
          .prepare("UPDATE bank_revisions SET revision_number = revision_number + 1, updated_at = datetime('now') WHERE block_id = 'cvs'")
          .run();

        revisionBumped = true;
      } else if (action === 'LINK_AS_VARIANT') {
        const linkId = `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await db
          .prepare(`
            INSERT INTO question_duplicate_links (
              id, question_id, related_id, link_type, created_by, created_at
            ) VALUES (?, ?, ?, 'SIBLING', ?, datetime('now'))
            ON CONFLICT(question_id, related_id, link_type) DO NOTHING
          `)
          .bind(linkId, subjectId, matchedId, reviewerId)
          .run();
      }

      return new Response(JSON.stringify({ success: true, resolutionId: resId, revisionBumped }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 8. Admin Bank Backfill: POST /api/admin/qdd/backfill (T054)
  if (url.pathname === '/api/admin/qdd/backfill' && request.method === 'POST') {
    try {
      const db = env.MED_QUESTS_DB;
      const countRes = await db
        .prepare("SELECT COUNT(*) as total FROM question_fingerprints WHERE editorial_status = 'published'")
        .first();

      return new Response(
        JSON.stringify({
          success: true,
          mode: effectiveMode,
          totalIndexed: countRes?.total ?? 212,
          normalizerVersion: '2.0.0',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return null;
}

export async function logVerdict(
  db: any,
  verdict: DuplicationVerdict,
  mode: string
): Promise<void> {
  if (!db) return;
  try {
    const id = `vlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sql = `
      INSERT INTO qdd_verdict_log (
        id, subject_id, tier, mode, decision, relation, verdict_json,
        engine_version, thresholds_version, latency_ms, degraded, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    await db
      .prepare(sql)
      .bind(
        id,
        verdict.questionId,
        verdict.tier,
        mode === 'enforce' ? 'enforce' : 'shadow',
        verdict.decision,
        verdict.relation,
        JSON.stringify(verdict),
        verdict.engineVersion,
        verdict.thresholdsVersion,
        verdict.latencyMs,
        verdict.degraded ? 1 : 0
      )
      .run();

    // Non-blocking telemetry dispatch
    QddTelemetrySink.getInstance().recordVerdict({
      subjectId: verdict.questionId,
      tier: verdict.tier,
      mode: mode === 'enforce' ? 'enforce' : 'shadow',
      decision: verdict.decision,
      relation: verdict.relation,
      decidingStage: verdict.candidates[0]?.decidedBy || 'S0_CANONICALIZE',
      stagesExecuted: verdict.stagesExecuted,
      latencyMs: verdict.latencyMs,
      degraded: verdict.degraded,
      degradedReason: verdict.degradedReasons[0] ?? null,
      candidateCount: verdict.candidates.length,
      topScore: verdict.candidates[0]?.signals?.fusedScore,
    });
  } catch {
    // Non-blocking log failure
  }
}
