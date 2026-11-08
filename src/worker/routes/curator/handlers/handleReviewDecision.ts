/**
 * Handler: POST /api/admin/questions/:id/review
 * Submits an editorial decision (Approve / Request Changes / Reject) on a proposed question.
 */

import { QuestionCanonicalHasher } from '../../../../domain/questionBank/canonicalHasher.ts';
import type { GovernedQuestion, Question } from '../../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import {
  guardCurator,
  jsonError,
  validateQuestionBatch,
} from '../../../middleware/workerGuards.ts';
import { upsertQuestionFingerprintToD1 } from '../../../qdd/compositionRoot.ts';
import { bumpD1BlockRevision } from '../../../repositories/d1QuestionBankRepository.ts';
import { D1CuratorRepository } from '../../../repositories/d1CuratorRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleReviewDecision(
  request: Request,
  env: Env,
  url: URL,
  questionId: string
): Promise<Response> {
  const command = (await request.json()) as {
    ticketId?: string;
    decision?: string;
    reviewerUserId?: string;
    reviewerDisplayName?: string;
    reviewerRole?: string;
    reviewerNotes?: string | null;
    inlinePatch?: Record<string, unknown>;
  };
  const decision = String(command.decision || '');
  const allowedDecisions = new Set([
    'approve_and_publish',
    'request_changes',
    'reject_submission',
  ]);
  if (!allowedDecisions.has(decision)) {
    return jsonError('Unsupported editorial decision.', 400);
  }

  const guard = guardCurator(request, url, {
    id: command.reviewerUserId,
    displayName: command.reviewerDisplayName,
    role: command.reviewerRole,
  });
  if (guard) return guard;

  const nowIso = new Date().toISOString();

  if (env.MED_QUESTS_DB) {
    try {
      const subRow = await D1CuratorRepository.fetchReviewSubmission(
        env.MED_QUESTS_DB,
        questionId,
        command.ticketId
      );

      if (subRow) {
        let nextStatus = 'pending_review';
        if (decision === 'approve_and_publish') nextStatus = 'published';
        else if (decision === 'request_changes') nextStatus = 'changes_requested';
        else if (decision === 'reject_submission') nextStatus = 'rejected';

        const rawQ = JSON.parse(subRow.question_payload_json) as Record<string, unknown>;
        const inlinePatch =
          command.inlinePatch && typeof command.inlinePatch === 'object'
            ? command.inlinePatch
            : {};
        let mergedQ: any = { ...rawQ, ...inlinePatch };
        let stemHash = QuestionCanonicalHasher.computeStemHashSync(
          String(mergedQ.stem || '')
        );

        if (nextStatus === 'published') {
          const validation = validateQuestionBatch([mergedQ], 1);
          if (!validation.ok) return validation.response;
          mergedQ = validation.questions[0];
          stemHash = QuestionCanonicalHasher.computeStemHashSync(String(mergedQ.stem || ''));
        }

        let newRev = await D1CuratorRepository.fetchBlockRevision(
          env.MED_QUESTS_DB,
          subRow.block_id
        );

        await D1CuratorRepository.updateReviewSubmissionStatus(
          env.MED_QUESTS_DB,
          {
            ticketId: subRow.ticket_id,
            editorialStatus: nextStatus,
            reviewerUserId: command.reviewerUserId || '',
            reviewerDisplayName: command.reviewerDisplayName || '',
            reviewedAt: nowIso,
            reviewerNotes: command.reviewerNotes || null,
          }
        );

        let publishedQuestion: GovernedQuestion | null = null;

        if (nextStatus === 'published') {
          newRev = await bumpD1BlockRevision(env.MED_QUESTS_DB, subRow.block_id);
          publishedQuestion = {
            ...mergedQ,
            provenanceScope: 'global-canonical',
            editorialStatus: 'published',
            status: 'active',
            stemHash,
            globalRevision: newRev,
            authorId: subRow.submitted_by_user_id,
            authorDisplayName: subRow.submitted_by_display_name,
            reviewedById: command.reviewerUserId,
            reviewedByDisplayName: command.reviewerDisplayName,
            reviewerNotes: command.reviewerNotes || null,
            publishedAt: nowIso,
            createdAt: subRow.submitted_at,
            updatedAt: nowIso,
          } as GovernedQuestion;

          await D1CuratorRepository.upsertCanonicalQuestion(
            env.MED_QUESTS_DB,
            publishedQuestion,
            'review_publish'
          );

          await upsertQuestionFingerprintToD1(env.MED_QUESTS_DB, mergedQ as Question);
        }

        const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const decisionStr = String(command.decision || '');
        const auditSummary = `Decision: ${decisionStr} on question ${questionId}. Notes: ${command.reviewerNotes || 'None'}`;
        const auditEntry = {
          id: auditId,
          questionId,
          blockId: subRow.block_id,
          action: `DECISION_${decisionStr.toUpperCase()}`,
          actorUserId: command.reviewerUserId || 'usr_curator',
          actorDisplayName: command.reviewerDisplayName || 'Faculty Reviewer',
          actorRole: command.reviewerRole || 'faculty',
          previousStatus: subRow.editorial_status,
          nextStatus,
          revisionAfter: newRev,
          summary: auditSummary,
          occurredAt: nowIso,
        };

        await D1CuratorRepository.insertAuditLog(env.MED_QUESTS_DB, auditEntry);

        return new Response(
          JSON.stringify({
            ticket: {
              ticketId: subRow.ticket_id,
              question: {
                ...mergedQ,
                editorialStatus: nextStatus,
                provenanceScope:
                  nextStatus === 'published'
                    ? 'global-canonical'
                    : 'submitted-pending',
                reviewedById: command.reviewerUserId,
                reviewedByDisplayName: command.reviewerDisplayName,
                reviewerNotes: command.reviewerNotes || null,
                reviewedAt: nowIso,
              },
              submittedByUserId: subRow.submitted_by_user_id,
              submittedByDisplayName: subRow.submitted_by_display_name,
              submittedByRole: subRow.submitted_by_role,
              submittedAt: subRow.submitted_at,
              editorialStatus: nextStatus,
              reviewedByUserId: command.reviewerUserId,
              reviewedByDisplayName: command.reviewerDisplayName,
              reviewedAt: nowIso,
              reviewerNotes: command.reviewerNotes || null,
            },
            promotedQuestion: publishedQuestion || undefined,
            auditEntry,
            newBlockRevision: newRev,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (e: unknown) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
        { status: 500 }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Submission not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
