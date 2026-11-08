/**
 * Handler: PUT /api/admin/questions/canonical/:id
 * Updates a canonical question in-place, increments revision, and records audit trail.
 */

import { QuestionCanonicalHasher } from '../../../../domain/questionBank/canonicalHasher.ts';
import { QuestionNormalizer } from '../../../../domain/questionBank/QuestionNormalizer.ts';
import type { GovernedQuestion } from '../../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import {
  guardCurator,
  jsonError,
  validateQuestionBatch,
} from '../../../middleware/workerGuards.ts';
import { upsertQuestionFingerprintToD1 } from '../../../qdd/compositionRoot.ts';
import {
  bumpD1BlockRevision,
  ensureGlobalBankSeeded,
} from '../../../repositories/d1QuestionBankRepository.ts';
import { D1CuratorRepository } from '../../../repositories/d1CuratorRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleUpdateCanonical(
  request: Request,
  env: Env,
  url: URL,
  questionId: string
): Promise<Response> {
  const params = (await request.json()) as {
    patch?: Record<string, unknown>;
    actorId?: string;
    actorDisplayName?: string;
    actorRole?: string;
    changeReason?: string;
  };
  const { patch, actorId, actorDisplayName, actorRole, changeReason } = params;

  const guard = guardCurator(request, url, {
    id: actorId,
    displayName: actorDisplayName,
    role: actorRole,
  });
  if (guard) return guard;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return jsonError('A question patch object is required.', 400);
  }
  if (typeof changeReason !== 'string' || changeReason.trim().length < 3) {
    return jsonError('A change reason of at least 3 characters is required.', 400);
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

      const sanitizedPatch = QuestionNormalizer.sanitizeMutationPatch(patch);
      const candidate = {
        ...existing,
        ...sanitizedPatch,
        bankVersion: existing.bankVersion + 1,
      };
      const validation = validateQuestionBatch([candidate], 1);
      if (!validation.ok) return validation.response;
      const validated = validation.questions[0];
      const stemHash = QuestionCanonicalHasher.computeStemHashSync(validated.stem);

      const duplicateId = await D1CuratorRepository.findDuplicateStemId(
        env.MED_QUESTS_DB,
        validated.chapterId,
        stemHash,
        questionId
      );
      if (duplicateId) {
        return jsonError(
          `Duplicate stem already exists in the canonical bank (question ${duplicateId}).`,
          409
        );
      }

      const nextRev = await bumpD1BlockRevision(
        env.MED_QUESTS_DB,
        existing.blockId
      );
      const nowIso = new Date().toISOString();
      const merged: GovernedQuestion = {
        ...existing,
        ...validated,
        stemHash,
        bankVersion: existing.bankVersion + 1,
        globalRevision: nextRev,
        reviewedById: actorId ?? null,
        reviewedByDisplayName: actorDisplayName ?? null,
        reviewerNotes: `Update reason: ${changeReason}`,
        updatedAt: nowIso,
      };

      await D1CuratorRepository.updateCanonicalQuestion(
        env.MED_QUESTS_DB,
        merged
      );
      await upsertQuestionFingerprintToD1(env.MED_QUESTS_DB, merged);

      const auditEntry = {
        id: `audit-${Date.now()}`,
        questionId,
        blockId: existing.blockId,
        action: 'CANONICAL_QUESTION_UPDATED',
        actorUserId: actorId || 'usr_curator',
        actorDisplayName: actorDisplayName || 'Faculty Admin',
        actorRole: actorRole || 'faculty',
        previousStatus: existing.editorialStatus,
        nextStatus: merged.editorialStatus,
        revisionAfter: nextRev,
        summary: `Updated canonical question: ${changeReason}`,
        occurredAt: nowIso,
      };

      await D1CuratorRepository.insertAuditLog(env.MED_QUESTS_DB, auditEntry);

      return new Response(
        JSON.stringify({
          updatedQuestion: merged,
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
