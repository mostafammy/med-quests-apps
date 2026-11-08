/**
 * Parser Selection Helper
 * Single Responsibility: Pure functions for filtering question sets based on selection and QDD collision status.
 */

import type { ParsedQuestionItem } from '../../../domain/questionBank/aiQuestionParser/types.ts';

export function isDuplicateItem(item: ParsedQuestionItem): boolean {
  const rel = item.qddVerdict?.relation;
  return rel === 'EXACT' || rel === 'NEAR' || rel === 'CONFLICT';
}

export function isUniqueItem(item: ParsedQuestionItem): boolean {
  const rel = item.qddVerdict?.relation;
  return rel === 'UNIQUE' || rel === 'SIBLING';
}

export function selectQuestionsForApproval(
  parsedQuestions: readonly ParsedQuestionItem[],
  selectedTempIds: ReadonlySet<string>,
  targetTempId?: string
): ParsedQuestionItem[] {
  if (targetTempId) {
    const item = parsedQuestions.find((p) => p.tempId === targetTempId);
    return item ? [item] : [];
  }

  const selectedDuplicates = parsedQuestions.filter(
    (p) => selectedTempIds.has(p.tempId) && isDuplicateItem(p)
  );

  if (selectedDuplicates.length > 0) {
    return selectedDuplicates;
  }

  return parsedQuestions.filter(isDuplicateItem);
}

export function selectQuestionsForCommit(
  parsedQuestions: readonly ParsedQuestionItem[],
  selectedTempIds: ReadonlySet<string>,
  selectedOnly: boolean
): ParsedQuestionItem[] {
  if (!selectedOnly) {
    return [...parsedQuestions];
  }
  return parsedQuestions.filter((item) => selectedTempIds.has(item.tempId));
}

export function computeRemainingItems(
  allQuestions: readonly ParsedQuestionItem[],
  processedQuestions: readonly ParsedQuestionItem[],
  selectedTempIds: ReadonlySet<string>
): { remainingQuestions: ParsedQuestionItem[]; remainingSelectedIds: Set<string> } {
  const processedIdSet = new Set(processedQuestions.map((q) => q.tempId));
  const remainingQuestions = allQuestions.filter((item) => !processedIdSet.has(item.tempId));
  const remainingSelectedIds = new Set(
    Array.from(selectedTempIds).filter((id) => !processedIdSet.has(id))
  );

  return { remainingQuestions, remainingSelectedIds };
}
