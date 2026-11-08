/**
 * Handler: DELETE /api/admin/questions/canonical/:id
 * Permanently removes or archives a canonical question from the global bank.
 */

import { guardCurator, jsonError } from '../../../middleware/workerGuards.ts';
import {
  bumpD1BlockRevision,
  ensureGlobalBankSeeded,
} from '../../../repositories/d1QuestionBankRepository.ts';
import { D1CuratorRepository } from '../../../repositories/d1CuratorRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleDeleteCanonical(
  request: Request,
  env: Env,
  url: URL,
  questionId: string
): Promise<Response> {
  let params: {
    actorId?: string;
    actorDisplayName?: string;
    actorRole?: string;
    reason?: string;
    permanent?: boolean;
  } = {};
  try {
    params = (await request.json()) as typeof params;
  } catch {
    // Fall back to URL search params
  }
  const actorId =
    params.actorId || url.searchParams.get('actorId') || 'usr_admin';
  const actorDisplayName =
    params.actorDisplayName ||
    url.searchParams.get('actorDisplayName') ||
    'Faculty Admin';
  const actorRole =
    params.actorRole || url.searchParams.get('actorRole') || 'admin';
  const reason =
    params.reason ||
    url.searchParams.get('reason') ||
    'Administrative curriculum deletion';
  const permanent = params.permanent !== false;

  const guard = guardCurator(request, url, {
    id: actorId,
    displayName: actorDisplayName,
    role: actorRole,
  });
  if (guard) return guard;

  if (env.MED_QUESTS_DB) {
    try {
      await ensureGlobalBankSeeded(env.MED_QUESTS_DB, 'cvs');
      const existing = await D1CuratorRepository.fetchCanonicalQuestion(
        env.MED_QUESTS_DB,
        questionId
      );

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Question not found' }), {
          status: 404,
        });
      }

      const nextRev = await bumpD1BlockRevision(
        env.MED_QUESTS_DB,
        existing.blockId
      );
      const nowIso = new Date().toISOString();

      await D1CuratorRepository.deleteCanonicalQuestion(env.MED_QUESTS_DB, {
        questionId,
        permanent,
        nextRev,
        nowIso,
      });

      const auditEntry = {
        id: `audit-${Date.now()}`,
        questionId,
        blockId: existing.blockId,
        action: permanent
          ? 'CANONICAL_QUESTION_DELETED'
          : 'CANONICAL_QUESTION_ARCHIVED',
        actorUserId: actorId,
        actorDisplayName,
        actorRole,
        previousStatus: existing.editorialStatus,
        nextStatus: permanent ? 'deleted' : 'archived',
        revisionAfter: nextRev,
        summary: `${permanent ? 'Permanently deleted' : 'Archived'} question: ${reason}`,
        occurredAt: nowIso,
      };

      await D1CuratorRepository.insertAuditLog(env.MED_QUESTS_DB, auditEntry);

      return new Response(
        JSON.stringify({
          deletedQuestionId: questionId,
          auditEntry,
          newBlockRevision: nextRev,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e: unknown) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
        { status: 500 }
      );
    }
  }

  return jsonError('Database unavailable', 503);
}
