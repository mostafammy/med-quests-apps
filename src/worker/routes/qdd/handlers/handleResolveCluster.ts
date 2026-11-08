import { QddTelemetrySink } from '../../../../infrastructure/questionBank/duplication/telemetry/QddTelemetrySink.ts';
import type { DuplicateRelation } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import type { Env } from '../../../types.ts';

interface ResolveClusterPayload {
  pairKey: string;
  subjectId: string;
  matchedId: string;
  engineRelation?: DuplicateRelation;
  humanRelation?: DuplicateRelation;
  action: string;
  reviewerId?: string;
  note?: string | null;
}

export async function handleResolveCluster(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as ResolveClusterPayload;
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
    if (!db) {
      return new Response(JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }), { status: 503 });
    }
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

      const revRow = await db
        .prepare("SELECT revision_number FROM bank_revisions WHERE block_id = 'cvs'")
        .first<{ revision_number?: number }>();
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
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
