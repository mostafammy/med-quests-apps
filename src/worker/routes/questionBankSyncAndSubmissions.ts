/**
 * Worker Routes: Global Question Bank Downstream Sync & Author Submissions
 * Endpoints:
 * - GET /api/bank/sync & /api/v1/bank/sync
 * - POST /api/bank/submissions & /api/v1/bank/submissions
 * - GET /api/bank/submissions/my & /api/v1/bank/submissions/my
 */

import type { BlockId } from '../../domain/curriculum/ids.ts';
import type { ViewerRole } from '../../domain/curriculum/BlockVisibilityPolicy.ts';
import { QuestionCanonicalHasher } from '../../domain/questionBank/canonicalHasher.ts';
import type { GovernedQuestion } from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { EdgeBlockGuard } from '../curriculum/EdgeBlockGuard.ts';
import { WorkerSeedBankRegistry } from '../curriculum/WorkerSeedBankRegistry.ts';
import {
  guardAuthor,
  validateQuestionBatch,
} from '../middleware/workerGuards.ts';
import { createWorkerQddEngine } from '../qdd/compositionRoot.ts';
import {
  buildDefaultSeededBank,
  ensureGlobalBankSeeded,
  mapRowToGovernedQuestion,
} from '../repositories/d1QuestionBankRepository.ts';
import type { Env } from '../types.ts';

export async function handleQuestionBankSyncRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // 7. Global Question Bank: Downstream Delta-Sync (Read-Only)
  if (
    (url.pathname === '/api/bank/sync' || url.pathname === '/api/v1/bank/sync') &&
    request.method === 'GET'
  ) {
    const rawBlock = url.searchParams.get('block');
    const edgeBlockGuard = new EdgeBlockGuard(env.MED_QUESTS_DB);
    const blockCheck = await edgeBlockGuard.requireKnownBlock(rawBlock);
    if (!blockCheck.ok) {
      return blockCheck.response;
    }
    const blockId = blockCheck.blockId;
    const sinceRev = Number(url.searchParams.get('sinceRev') || 0);
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));

    let currentRev = 1;
    if (env.MED_QUESTS_DB) {
      try {
        await ensureGlobalBankSeeded(env.MED_QUESTS_DB, blockId);
        const revRow = await env.MED_QUESTS_DB.prepare(
          'SELECT revision_number FROM bank_revisions WHERE block_id = ?'
        )
          .bind(blockId)
          .first<{ revision_number: number }>();
        if (revRow) currentRev = revRow.revision_number;
      } catch {
        // Fall back to 1
      }
    }

    const clientEtag = request.headers.get('if-none-match');
    const serverEtag = `W/rev-${currentRev}`;

    // Lightweight periodic probe: revision + canonical count only (no question payloads).
    if (url.searchParams.get('probe') === '1') {
      let canonicalCount =
        WorkerSeedBankRegistry.getSeedQuestions(blockId).length;
      if (env.MED_QUESTS_DB) {
        try {
          const countRow = await env.MED_QUESTS_DB.prepare(
            `SELECT COUNT(*) AS cnt FROM global_questions
             WHERE block_id = ? AND editorial_status = 'published'`
          )
            .bind(blockId)
            .first<{ cnt: number }>();
          canonicalCount = Number(countRow?.cnt ?? 0);
        } catch {
          // Keep bundled fallback count.
        }
      }

      return new Response(
        JSON.stringify({
          blockId,
          revision: currentRev,
          etag: serverEtag,
          canonicalCount,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ETag: serverEtag,
            'Cache-Control': 'no-cache, must-revalidate',
          },
        }
      );
    }

    if (
      offset === 0 &&
      (clientEtag === serverEtag || (sinceRev > 0 && sinceRev >= currentRev))
    ) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: serverEtag,
          'Cache-Control': 'no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      });
    }

    let upserted: GovernedQuestion[] = [];
    const archivedIds: string[] = [];
    let hasMore = false;
    let nextOffset: number | undefined;
    let nextSinceRev: number | undefined;

    if (env.MED_QUESTS_DB) {
      try {
        const query = await env.MED_QUESTS_DB.prepare(
          `SELECT * FROM global_questions
           WHERE block_id = ? AND global_revision > ?
           ORDER BY global_revision ASC, id ASC LIMIT 1001 OFFSET ?`
        )
          .bind(blockId, sinceRev, offset)
          .all<Record<string, unknown>>();

        const rows = query.results || [];
        hasMore = rows.length > 1000;
        const pageRows = hasMore ? rows.slice(0, 1000) : rows;
        nextOffset = hasMore ? offset + pageRows.length : undefined;
        if (pageRows.length > 0) {
          nextSinceRev = Number(pageRows[pageRows.length - 1].global_revision);
        }

        for (const row of pageRows) {
          const item = mapRowToGovernedQuestion(row);
          if (row.editorial_status === 'archived') {
            archivedIds.push(String(row.id));
          } else {
            upserted.push(item);
          }
        }
      } catch {
        // Default fallback if table not yet initialized
      }
    }

    if (upserted.length === 0 && sinceRev === 0 && offset === 0) {
      upserted = buildDefaultSeededBank(blockId);
    }

    return new Response(
      JSON.stringify({
        status: 'delta-applied',
        blockId,
        revision: currentRev,
        syncedAt: new Date().toISOString(),
        etag: serverEtag,
        upsertedQuestions: upserted,
        archivedQuestionIds: archivedIds,
        hasMore,
        nextOffset,
        nextSinceRev,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ETag: serverEtag,
          'Cache-Control': 'no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  }

  // 8. Global Question Bank: Author Submission Queue
  if (
    (url.pathname === '/api/bank/submissions' ||
      url.pathname === '/api/v1/bank/submissions') &&
    request.method === 'POST'
  ) {
    const payload = (await request.json()) as {
      questions?: unknown[];
      authorId?: string;
      authorDisplayName?: string;
      authorRole?: string;
      allowDuplicateStems?: boolean;
      reviewerNotes?: string;
    };
    const { questions, authorId, authorDisplayName, authorRole } = payload;

    const guard = guardAuthor(request, url, {
      id: authorId,
      displayName: authorDisplayName,
      role: authorRole,
    });
    if (guard) return guard;

    const validation = validateQuestionBatch(questions, 20);
    if (!validation.ok) return validation.response;
    const validatedQuestions = validation.questions;

    const targetBlockId = (url.searchParams.get('block') ||
      validatedQuestions[0]?.blockId ||
      'cvs') as BlockId;
    const edgeBlockGuard = new EdgeBlockGuard(env.MED_QUESTS_DB);
    const writeCheck = await edgeBlockGuard.requireWritableBlock(
      targetBlockId,
      (authorRole as ViewerRole) || 'faculty-reviewer'
    );
    if (!writeCheck.ok) {
      return writeCheck.response;
    }

    const tickets: Array<Record<string, unknown>> = [];
    const duplicateQuestionIds: string[] = [];
    const nowIso = new Date().toISOString();

    if (env.MED_QUESTS_DB) {
      const qddEngine = createWorkerQddEngine(env.MED_QUESTS_DB);

      for (const q of validatedQuestions) {
        const stemHash = QuestionCanonicalHasher.computeStemHashSync(q.stem);
        const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        try {
          const qddCheck = await qddEngine.check(
            q,
            {
              kind: 'block',
              blockId: q.blockId || 'cvs',
            },
            'edge-authoritative'
          );
          const qddVerdict = qddCheck.ok ? qddCheck.value : null;
          const allowDuplicateStems = Boolean(payload.allowDuplicateStems);

          if (
            qddVerdict &&
            qddVerdict.decision === 'BLOCK' &&
            !allowDuplicateStems
          ) {
            duplicateQuestionIds.push(q.id);
            if (validatedQuestions.length === 1) {
              return new Response(
                JSON.stringify({
                  error: 'QDD_EXACT_DUPLICATE',
                  message:
                    'Identical question already exists in the published bank.',
                  verdict: qddVerdict,
                }),
                { status: 409, headers: { 'Content-Type': 'application/json' } }
              );
            }
            continue;
          }

          if (!allowDuplicateStems) {
            const duplicate = await env.MED_QUESTS_DB.prepare(
              `SELECT 1 AS found FROM global_questions
               WHERE chapter_id = ? AND stem_hash = ? AND editorial_status = 'published'
               UNION ALL
               SELECT 1 AS found FROM question_review_submissions
               WHERE chapter_id = ? AND stem_hash = ?
                 AND editorial_status IN ('pending_review', 'changes_requested')
               LIMIT 1`
            )
              .bind(q.chapterId, stemHash, q.chapterId, stemHash)
              .first<{ found: number }>();

            if (duplicate) {
              duplicateQuestionIds.push(q.id);
              continue;
            }
          }

          const storedPayload = {
            ...q,
            _qddVerdict: qddVerdict,
            _reviewerNotes: payload.reviewerNotes || null,
          };

          await env.MED_QUESTS_DB.prepare(
            `INSERT INTO question_review_submissions (
              ticket_id, question_id, block_id, subject_id, chapter_id, topic_id,
              stem_hash, question_payload_json, editorial_status,
              submitted_by_user_id, submitted_by_display_name, submitted_by_role, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?)`
          )
            .bind(
              ticketId,
              q.id,
              q.blockId || 'cvs',
              q.subjectId,
              q.chapterId,
              q.topicId,
              stemHash,
              JSON.stringify(storedPayload),
              authorId,
              authorDisplayName,
              authorRole,
              nowIso
            )
            .run();

          tickets.push({
            ticketId,
            question: {
              ...q,
              provenanceScope: 'submitted-pending',
              editorialStatus: 'pending_review',
              stemHash,
              authorId,
              authorDisplayName,
              submittedAt: nowIso,
            },
            submittedByUserId: authorId,
            submittedByDisplayName: authorDisplayName,
            submittedByRole: authorRole,
            submittedAt: nowIso,
            editorialStatus: 'pending_review',
          });
        } catch {
          duplicateQuestionIds.push(q.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        submittedTickets: tickets,
        duplicateQuestionIds,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 11. Author: List My Submissions
  if (
    (url.pathname === '/api/bank/submissions/my' ||
      url.pathname === '/api/v1/bank/submissions/my') &&
    request.method === 'GET'
  ) {
    const authorId = url.searchParams.get('authorId');
    const rawBlock = url.searchParams.get('block');
    if (rawBlock) {
      const edgeBlockGuard = new EdgeBlockGuard(env.MED_QUESTS_DB);
      const blockCheck = await edgeBlockGuard.requireKnownBlock(rawBlock);
      if (!blockCheck.ok) {
        return blockCheck.response;
      }
    }
    let results: Array<Record<string, unknown>> = [];

    if (env.MED_QUESTS_DB && authorId) {
      try {
        const rows = await env.MED_QUESTS_DB.prepare(
          `SELECT * FROM question_review_submissions
           WHERE submitted_by_user_id = ?
           ORDER BY submitted_at DESC LIMIT 100`
        )
          .bind(authorId)
          .all<{
            ticket_id: string;
            question_payload_json: string;
            editorial_status: string;
            submitted_at: string;
            reviewed_by_display_name: string | null;
            reviewer_notes: string | null;
          }>();

        results = (rows.results || []).map((r) => {
          const parsedQuestion = JSON.parse(r.question_payload_json);
          const qddVerdict = parsedQuestion._qddVerdict || null;
          return {
            ticketId: r.ticket_id,
            question: parsedQuestion,
            editorialStatus: r.editorial_status,
            submittedAt: r.submitted_at,
            reviewedByDisplayName: r.reviewed_by_display_name,
            reviewerNotes: r.reviewer_notes,
            qddVerdict,
          };
        });
      } catch {
        // Table empty
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}
