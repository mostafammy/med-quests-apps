/**
 * AI Question Parser Store & Service Types
 * Defines unified contracts for ingestion, review routing, and canonical commits.
 */

import type { UserRole } from '../../../domain/auth/types.ts';
import type { ParsedQuestionItem } from '../../../domain/questionBank/aiQuestionParser/types.ts';

export interface EditorialActor {
  id: string;
  displayName: string;
  role: UserRole;
}

export interface AiParserFeedback {
  type: 'success' | 'error';
  message: string;
}

export interface AiParserActionResult {
  ok: boolean;
  remainingQuestions: ParsedQuestionItem[];
  remainingSelectedIds: Set<string>;
  feedback: AiParserFeedback;
}

// Backward-compatible aliases for legacy imports
export type RouteToApprovalResult = AiParserActionResult;
export type BankCommitResult = AiParserActionResult;
