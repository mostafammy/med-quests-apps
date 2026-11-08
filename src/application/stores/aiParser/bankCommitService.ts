/**
 * BankCommitService (Facade)
 *
 * Provides a clean, backward-compatible facade for question ingestion workflows:
 * - Routing duplicate/flagged questions to Faculty Approval Queue
 * - Committing verified canonical questions to Global Question Bank
 *
 * Internal logic is decomposed into dedicated, single-responsibility modules:
 * - types.ts: Shared data contracts and result interfaces
 * - parserAuthResolver.ts: Actor resolution & role gatekeeping
 * - parserSelectionHelper.ts: Pure item filtering & remaining set computation
 * - approvalQueueRouter.ts: Edge review queue ticket creation
 * - canonicalBankCommitter.ts: Safe canonical bank persistence
 */

import type { BlockId } from '../../../domain/curriculum/ids.ts';
import type { ParsedQuestionItem } from '../../../domain/questionBank/aiQuestionParser/types.ts';
import { useAuthStore } from '../useAuthStore.ts';
import { resolveEditorialActor, requireAdminActor } from './parserAuthResolver.ts';
import {
  selectQuestionsForApproval,
  selectQuestionsForCommit,
  computeRemainingItems,
} from './parserSelectionHelper.ts';
import { routeQuestionsToApprovalQueue } from './approvalQueueRouter.ts';
import { commitCanonicalQuestionsToBank } from './canonicalBankCommitter.ts';
import type { RouteToApprovalResult, BankCommitResult } from './types.ts';

export type { RouteToApprovalResult, BankCommitResult } from './types.ts';

export async function executeSendToApprovalQueue(
  parsedQuestions: ParsedQuestionItem[],
  selectedTempIds: Set<string>,
  targetBlockId: BlockId,
  targetTempId?: string
): Promise<RouteToApprovalResult> {
  const actor = resolveEditorialActor(useAuthStore.getState().authState);
  const itemsToRoute = selectQuestionsForApproval(parsedQuestions, selectedTempIds, targetTempId);

  if (itemsToRoute.length === 0) {
    return {
      ok: false,
      remainingQuestions: parsedQuestions,
      remainingSelectedIds: selectedTempIds,
      feedback: {
        type: 'error',
        message: 'No duplicate questions found to route for approval.',
      },
    };
  }

  try {
    const res = await routeQuestionsToApprovalQueue({
      itemsToRoute,
      targetBlockId,
      actor,
    });

    if (res.ok) {
      const { remainingQuestions, remainingSelectedIds } = computeRemainingItems(
        parsedQuestions,
        itemsToRoute,
        selectedTempIds
      );
      return {
        ok: true,
        remainingQuestions,
        remainingSelectedIds,
        feedback: {
          type: 'success',
          message: `Successfully routed ${itemsToRoute.length} duplicate question(s) to the Faculty Approval Queue (Review Tickets created).`,
        },
      };
    }

    return {
      ok: false,
      remainingQuestions: parsedQuestions,
      remainingSelectedIds: selectedTempIds,
      feedback: {
        type: 'error',
        message: res.errorMessage || 'Could not route to approval queue.',
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      remainingQuestions: parsedQuestions,
      remainingSelectedIds: selectedTempIds,
      feedback: {
        type: 'error',
        message: `Routing failed: ${err instanceof Error && err.message ? err.message : 'Unknown processing error'}`,
      },
    };
  }
}

export async function executeCommitToGlobalQuestionBank(
  parsedQuestions: ParsedQuestionItem[],
  selectedTempIds: Set<string>,
  targetBlockId: BlockId,
  selectedOnly = true
): Promise<BankCommitResult> {
  const authRes = requireAdminActor(useAuthStore.getState().authState);
  if (!authRes.ok) {
    return {
      ok: false,
      remainingQuestions: parsedQuestions,
      remainingSelectedIds: selectedTempIds,
      feedback: {
        type: 'error',
        message: authRes.error,
      },
    };
  }

  const itemsToCommit = selectQuestionsForCommit(parsedQuestions, selectedTempIds, selectedOnly);

  if (itemsToCommit.length === 0) {
    return {
      ok: false,
      remainingQuestions: parsedQuestions,
      remainingSelectedIds: selectedTempIds,
      feedback: {
        type: 'error',
        message: 'No questions selected for commit.',
      },
    };
  }

  try {
    const res = await commitCanonicalQuestionsToBank({
      itemsToCommit,
      targetBlockId,
      actor: authRes.actor,
    });

    if (res.ok) {
      const { remainingQuestions, remainingSelectedIds } = computeRemainingItems(
        parsedQuestions,
        itemsToCommit,
        selectedTempIds
      );
      return {
        ok: true,
        remainingQuestions,
        remainingSelectedIds,
        feedback: {
          type: 'success',
          message: `Successfully approved & committed ${itemsToCommit.length} canonical questions to the Global Bank!`,
        },
      };
    }

    return {
      ok: false,
      remainingQuestions: parsedQuestions,
      remainingSelectedIds: selectedTempIds,
      feedback: {
        type: 'error',
        message: res.errorMessage || 'Failed to commit questions to Global Question Bank.',
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      remainingQuestions: parsedQuestions,
      remainingSelectedIds: selectedTempIds,
      feedback: {
        type: 'error',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Error committing questions to bank.',
      },
    };
  }
}
