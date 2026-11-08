/**
 * ApprovalQueueRouter
 * Single Responsibility: Routes duplicate/flagged question candidates to the
 * Faculty Editorial Review Queue on the Edge Gateway.
 */

import type { BlockId } from '../../../domain/curriculum/ids.ts';
import type { ParsedQuestionItem } from '../../../domain/questionBank/aiQuestionParser/types.ts';
import { edgeQuestionBankGateway } from '../../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { useBankGovernanceStore } from '../useBankGovernanceStore.ts';
import { toQddProbe } from './qddVerificationService.ts';
import type { EditorialActor } from './types.ts';

export interface RouteToApprovalOptions {
  itemsToRoute: ParsedQuestionItem[];
  targetBlockId: BlockId;
  actor: EditorialActor;
}

export interface RouteToApprovalResponse {
  ok: boolean;
  count: number;
  errorMessage?: string;
}

export async function routeQuestionsToApprovalQueue(
  options: RouteToApprovalOptions
): Promise<RouteToApprovalResponse> {
  const { itemsToRoute, targetBlockId, actor } = options;

  if (itemsToRoute.length === 0) {
    return { ok: false, count: 0, errorMessage: 'No duplicate questions found to route for approval.' };
  }

  const questionsToSubmit = itemsToRoute.map((item) => {
    const q = toQddProbe(item.question);
    const cand = item.qddVerdict?.candidates[0];
    const collisionNote = cand
      ? `[QDD Auto-Triage: ${item.qddVerdict?.relation}] Matched against bank question ${cand.matchedQuestionId}`
      : `[QDD Auto-Triage: ${item.qddVerdict?.relation || 'DUPLICATE'}] Flagged by Prebuilt Duplication Engine`;

    return {
      ...q,
      evidence: [
        ...(q.evidence || []),
        {
          chunkId: `qdd-flag-${Date.now().toString(36)}`,
          sourceName: 'Duplication Detection Engine',
          location: 'Pre-Approval Triage',
          quote: collisionNote,
          kind: 'text' as const,
        },
      ],
    };
  });

  const res = await edgeQuestionBankGateway.submitQuestionsForGlobalReview({
    questions: questionsToSubmit,
    authorId: actor.id,
    authorDisplayName: actor.displayName,
    authorRole: actor.role,
    allowDuplicateStems: true,
    reviewerNotes: 'Flagged duplicate/collision routed from AI Question Ingestion Lab for faculty editorial review.',
  });

  if (!res.ok) {
    return {
      ok: false,
      count: 0,
      errorMessage: `Could not route to approval queue: ${res.error.code}`,
    };
  }

  // Refresh governance data in background
  await useBankGovernanceStore.getState().loadGovernanceData(targetBlockId);

  return { ok: true, count: itemsToRoute.length };
}
