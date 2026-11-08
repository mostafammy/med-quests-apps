/**
 * Handler: POST /api/admin/questions/canonical
 * Directly creates and publishes a batch of canonical questions into the global bank.
 */

import { QuestionCanonicalHasher } from '../../../../domain/questionBank/canonicalHasher.ts';
import type { GovernedQuestion } from '../../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import {
  guardCurator,
  jsonError,
  validateQuestionBatch,
} from '../../../middleware/workerGuards.ts';
import {
  createWorkerQddEngine,
  upsertQuestionFingerprintToD1,
} from '../../../qdd/compositionRoot.ts';
import {
  bumpD1BlockRevision,
  ensureGlobalBankSeeded,
} from '../../../repositories/d1QuestionBankRepository.ts';
import { D1CuratorRepository } from '../../../repositories/d1CuratorRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleCreateCanonical(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const params = (await request.json()) as {
    questions?: unknown[];
    actorId?: string;
    actorDisplayName?: string;
    actorRole?: string;
  };
  const { questions, actorId, actorDisplayName, actorRole } = params;

  const guard = guardCurator(request, url, {
    id: actorId,
    displayName: actorDisplayName,
    role: actorRole,
  });
  if (guard) return guard;

  const validation = validateQuestionBatch(questions, 50);
  if (!validation.ok) return validation.response;
  const validatedQuestions = validation.questions;

  const blockIds = new Set(validatedQuestions.map((q) => q.blockId || 'cvs'));
  if (blockIds.size !== 1) {
    return jsonError(
      'All questions in a batch must belong to the same curriculum block.',
      400
    );
  }

  if (env.MED_QUESTS_DB) {
    try {
      const blockId = validatedQuestions[0].blockId || 'cvs';
      await ensureGlobalBankSeeded(env.MED_QUESTS_DB, blockId);

      const qddEngine = createWorkerQddEngine(env.MED_QUESTS_DB);
      for (const q of validatedQuestions) {
        const qddRes = await qddEngine.check(
          q,
          { kind: 'block', blockId },
          'edge-authoritative'
        );
        if (qddRes.ok && qddRes.value.decision === 'BLOCK') {
          const matchedCandidate = qddRes.value.candidates[0];
          if (
            matchedCandidate &&
            matchedCandidate.matchedQuestionId !== q.id
          ) {
            return jsonError(
              `Duplicate question already exists in the canonical bank (${matchedCandidate.matchedQuestionId}).`,
              409
            );
          }
        }

        const stemHash = QuestionCanonicalHasher.computeStemHashSync(q.stem);
        const duplicateId = await D1CuratorRepository.findDuplicateStemId(
          env.MED_QUESTS_DB,
          q.chapterId,
          stemHash,
          q.id
        );
        if (duplicateId) {
          return jsonError(
            `Duplicate stem already exists in the canonical bank (question ${duplicateId}).`,
            409
          );
        }
      }

      const nextRev = await bumpD1BlockRevision(env.MED_QUESTS_DB, blockId);
      const nowIso = new Date().toISOString();
      const created: GovernedQuestion[] = [];

      for (const q of validatedQuestions) {
        const stemHash = QuestionCanonicalHasher.computeStemHashSync(q.stem);
        const governedItem: GovernedQuestion = {
          ...q,
          provenanceScope: 'global-canonical',
          editorialStatus: 'published',
          status: 'active',
          stemHash,
          globalRevision: nextRev,
          authorId: actorId || 'usr_admin',
          authorDisplayName: actorDisplayName || 'Faculty Admin',
          reviewedById: actorId || 'usr_admin',
          reviewedByDisplayName: actorDisplayName || 'Faculty Admin',
          reviewerNotes: 'Directly authored by Faculty/Admin.',
          publishedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await D1CuratorRepository.upsertCanonicalQuestion(
          env.MED_QUESTS_DB,
          governedItem,
          'direct_create'
        );
        created.push(governedItem);
        await upsertQuestionFingerprintToD1(env.MED_QUESTS_DB, q);
      }

      await D1CuratorRepository.insertAuditLog(env.MED_QUESTS_DB, {
        id: `audit-${Date.now()}`,
        questionId: created[0].id,
        blockId,
        action: 'CANONICAL_QUESTION_CREATED',
        actorUserId: actorId || 'usr_admin',
        actorDisplayName: actorDisplayName || 'Faculty Admin',
        actorRole: actorRole || 'admin',
        previousStatus: null,
        nextStatus: 'published',
        revisionAfter: nextRev,
        summary: `Created ${created.length} canonical questions directly in the Global Bank.`,
        occurredAt: nowIso,
      });

      return new Response(
        JSON.stringify({ created, newBlockRevision: nextRev }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
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
