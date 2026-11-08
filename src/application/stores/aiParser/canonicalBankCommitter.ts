/**
 * CanonicalBankCommitter
 * Single Responsibility: Validates collision safety and commits canonical questions
 * to the Global Question Bank and local IndexedDB cache.
 */

import type { Question } from '../../../domain/model/types.ts';
import type { BlockId } from '../../../domain/curriculum/ids.ts';
import { LEGACY_DEFAULT_BLOCK_ID } from '../../../domain/curriculum/ids.ts';
import { normalizeBlockId } from '../../../domain/questionBank/aiQuestionParser/QuestionParsingAgent.ts';
import type { ParsedQuestionItem } from '../../../domain/questionBank/aiQuestionParser/types.ts';
import { edgeQuestionBankGateway } from '../../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import { useBankGovernanceStore } from '../useBankGovernanceStore.ts';
import { useQuestionStore } from '../useQuestionStore.ts';
import { useBlockContextStoreBase } from '../useBlockContextStore.ts';
import { isDuplicateItem } from './parserSelectionHelper.ts';
import type { EditorialActor } from './types.ts';

export interface CommitCanonicalOptions {
  itemsToCommit: ParsedQuestionItem[];
  targetBlockId: BlockId;
  actor: EditorialActor;
}

export interface CommitCanonicalResponse {
  ok: boolean;
  committedCount: number;
  errorMessage?: string;
}

export async function commitCanonicalQuestionsToBank(
  options: CommitCanonicalOptions
): Promise<CommitCanonicalResponse> {
  const { itemsToCommit, targetBlockId, actor } = options;

  if (itemsToCommit.length === 0) {
    return { ok: false, committedCount: 0, errorMessage: 'No questions selected for commit.' };
  }

  // Pre-flight collision check: Ensure no duplicate/conflicting questions bypass the faculty queue
  const duplicateItems = itemsToCommit.filter(isDuplicateItem);
  if (duplicateItems.length > 0) {
    return {
      ok: false,
      committedCount: 0,
      errorMessage: `Direct commit blocked: ${duplicateItems.length} question(s) already exist in the bank or have collisions. Please send them to the Faculty Approval Queue or deselect them before committing.`,
    };
  }

  const globalActiveBlock =
    typeof useBlockContextStoreBase !== 'undefined'
      ? useBlockContextStoreBase.getState().activeBlockId
      : targetBlockId;

  const rawBlockId =
    itemsToCommit[0]?.question?.blockId ||
    targetBlockId ||
    globalActiveBlock ||
    LEGACY_DEFAULT_BLOCK_ID;

  const firstQ = itemsToCommit[0]?.question;
  const commitBlockId = normalizeBlockId(
    rawBlockId,
    globalActiveBlock,
    firstQ ? { id: firstQ.id, subjectId: firstQ.subjectId, stem: firstQ.stem } : undefined
  ) as BlockId;

  const canonicalQuestions = itemsToCommit.map((item) => ({
    ...item.question,
    blockId: commitBlockId,
  }));

  const { createCanonicalQuestions } = useBankGovernanceStore.getState();
  const success = await createCanonicalQuestions(canonicalQuestions, {
    id: actor.id,
    displayName: actor.displayName,
    role: actor.role,
  });

  if (!success) {
    return {
      ok: false,
      committedCount: 0,
      errorMessage: 'Failed to commit questions to Global Question Bank. Check console for logs.',
    };
  }

  // Persist canonical questions locally to IndexedDB
  try {
    await db.questions.bulkPut(canonicalQuestions);
    const allCanonical = edgeQuestionBankGateway.getLocalCanonicalBank(commitBlockId);
    if (allCanonical.length > 0) {
      await db.questions.bulkPut(allCanonical as unknown as Question[]);
    }
  } catch {
    // Ignore IndexedDB write error in non-browser environment
  }

  await useBankGovernanceStore.getState().loadGovernanceData(commitBlockId);
  await useQuestionStore.getState().loadQuestions(commitBlockId);

  // Auto-align active block context so the user immediately sees the newly ingested questions
  if (typeof useBlockContextStoreBase !== 'undefined') {
    try {
      const currentActive = useBlockContextStoreBase.getState().activeBlockId;
      if (currentActive !== commitBlockId) {
        await useBlockContextStoreBase.getState().switchBlock(commitBlockId, 'user-switcher');
      }
    } catch (switchErr) {
      console.warn('[CanonicalBankCommitter] Auto-align block context skipped:', switchErr);
    }
  }

  return { ok: true, committedCount: itemsToCommit.length };
}
