/**
 * Handler: PATCH /api/admin/questions/canonical/:id/archive
 * Toggles archive / active status for a canonical question in the global bank.
 */

import type { GovernedQuestion } from '../../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { guardCurator, jsonError } from '../../../middleware/workerGuards.ts';
import {
  bumpD1BlockRevision,
  ensureGlobalBankSeeded,
} from '../../../repositories/d1QuestionBankRepository.ts';
import { D1CuratorRepository } from '../../../repositories/d1CuratorRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleArchiveCanonical(
  request: Request,
  env: Env,
  url: URL,
  questionId: string
): Promise<Response> {
  const params = (await request.json()) as {
    archive?: boolean;
    actorId?: string;
    actorDisplayName?: string;
    actorRole?: string;
    reason?: string;
  };
  const { archive, actorId, actorDisplayName, actorRole, reason } = params;

  const guard = guardCurator(request, url, {
    id: actorId,
    displayName: actorDisplayName,
    role: actorRole,
  });
  if (guard) return guard;
  if (typeof archive !== 'boolean') {
    return jsonError('The archive field must be a boolean.', 400);
  }
  if (typeof reason !== 'string' || reason.trim().length < 3) {
    return jsonError('A reason of at least 3 characters is required.', 400);
  }

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
      const nextStatus = archive ? 'archived' : 'published';

      await D1CuratorRepository.setCanonicalArchiveStatus(env.MED_QUESTS_DB, {
        questionId,
        nextStatus,
        nextRev,
        nowIso,
      });

      const updatedQuestion: GovernedQuestion = {
        ...existing,
        editorialStatus: nextStatus,
        status: archive ? 'quarantined' : 'active',
        globalRevision: nextRev,
        updatedAt: nowIso,
      };

      const auditEntry = {
        id: `audit-${Date.now()}`,
        questionId,
        blockId: existing.blockId,
        action: archive
          ? 'CANONICAL_QUESTION_ARCHIVED'
          : 'CANONICAL_QUESTION_RESTORED',
        actorUserId: actorId || 'usr_curator',
        actorDisplayName: actorDisplayName || 'Faculty Admin',
        actorRole: actorRole || 'faculty',
        previousStatus: existing.editorialStatus,
        nextStatus,
        revisionAfter: nextRev,
        summary: `${archive ? 'Archived' : 'Restored'} question. Reason: ${reason}`,
        occurredAt: nowIso,
      };

      await D1CuratorRepository.insertAuditLog(env.MED_QUESTS_DB, auditEntry);

      return new Response(
        JSON.stringify({
          updatedQuestion,
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
