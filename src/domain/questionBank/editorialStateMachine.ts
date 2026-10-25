/**
 * Domain Service: Question Editorial Lifecycle State Machine & Audit Engine
 * Layer: Domain (State Pattern + Role Security Enforcement)
 */

import { ok, err, type Result } from '../shared/result.ts';
import type {
  GovernedQuestion,
  QuestionReviewSubmission,
  EditorialDecisionCommand,
  EditorialAuditLogEntry,
  EditorialAuditEventId,
  QuestionEditorialStatus,
  BankRevisionNumber,
  QuestionBankDomainError,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export interface EditorialTransitionOutcome {
  readonly updatedSubmission: QuestionReviewSubmission;
  readonly publishedQuestion: GovernedQuestion | null;
  readonly auditEntry: EditorialAuditLogEntry;
}

export class QuestionEditorialStateMachine {
  /**
   * Evaluates whether a transition from `fromStatus` using `decision` is clinically valid.
   */
  public static canTransition(
    fromStatus: QuestionEditorialStatus,
    decision: EditorialDecisionCommand['decision']
  ): boolean {
    if (fromStatus === 'pending_review' || fromStatus === 'changes_requested') {
      return (
        decision === 'approve_and_publish' ||
        decision === 'request_changes' ||
        decision === 'reject_submission'
      );
    }
    return false;
  }

  /**
   * Executes the atomic transition of a question submission ticket.
   */
  public static transition(
    submission: QuestionReviewSubmission,
    command: EditorialDecisionCommand,
    nextBlockRevision: BankRevisionNumber
  ): Result<EditorialTransitionOutcome, QuestionBankDomainError> {
    // 1. Role Permission Guard
    if (command.reviewerRole !== 'faculty-reviewer' && command.reviewerRole !== 'admin') {
      return err({
        code: 'INSUFFICIENT_EDITORIAL_PERMISSION',
        requiredRoles: ['faculty-reviewer', 'admin'],
        actualRole: command.reviewerRole,
        operation: `Review Decision: ${command.decision}`,
      });
    }

    // 2. State Transition Invariant Guard
    const currentStatus = submission.editorialStatus;
    if (!this.canTransition(currentStatus, command.decision)) {
      return err({
        code: 'INVALID_EDITORIAL_STATE_TRANSITION',
        questionId: submission.question.id,
        fromStatus: currentStatus,
        attemptedDecision: command.decision,
        message: `Cannot transition question from status '${currentStatus}' with decision '${command.decision}'.`,
      });
    }

    const nowIso = new Date().toISOString();
    let nextStatus: QuestionEditorialStatus;
    let publishedQuestion: GovernedQuestion | null = null;
    let auditAction: EditorialAuditLogEntry['action'];

    switch (command.decision) {
      case 'approve_and_publish': {
        nextStatus = 'published';
        auditAction = 'SUBMISSION_APPROVED';

        // Apply optional reviewer inline patch if provided
        const baseQuestion = submission.question;
        const patch = command.inlinePatch || {};

        publishedQuestion = {
          ...baseQuestion,
          ...patch,
          choices: patch.choices ? [...patch.choices] : [...baseQuestion.choices],
          provenanceScope: 'global-canonical',
          editorialStatus: 'published',
          status: 'active',
          globalRevision: nextBlockRevision,
          bankVersion: baseQuestion.bankVersion + (command.inlinePatch ? 1 : 0),
          reviewedById: command.reviewerUserId,
          reviewedByDisplayName: command.reviewerDisplayName,
          reviewerNotes: command.reviewerNotes,
          publishedAt: nowIso,
          updatedAt: nowIso,
        };
        break;
      }
      case 'request_changes': {
        nextStatus = 'changes_requested';
        auditAction = 'SUBMISSION_CHANGES_REQUESTED';
        break;
      }
      case 'reject_submission': {
        nextStatus = 'rejected';
        auditAction = 'SUBMISSION_REJECTED';
        break;
      }
    }

    const updatedSubmission: QuestionReviewSubmission = {
      ...submission,
      editorialStatus: nextStatus as QuestionReviewSubmission['editorialStatus'],
      reviewedByUserId: command.reviewerUserId,
      reviewedByDisplayName: command.reviewerDisplayName,
      reviewedAt: nowIso,
      reviewerNotes: command.reviewerNotes,
      question: publishedQuestion ?? {
        ...submission.question,
        editorialStatus: nextStatus,
        reviewerNotes: command.reviewerNotes,
        updatedAt: nowIso,
      },
    };

    const auditEntry: EditorialAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as EditorialAuditEventId,
      questionId: submission.question.id,
      blockId: submission.question.blockId,
      action: auditAction,
      actorUserId: command.reviewerUserId,
      actorDisplayName: command.reviewerDisplayName,
      actorRole: command.reviewerRole,
      previousStatus: currentStatus,
      nextStatus,
      revisionAfter: nextBlockRevision,
      summary: `Decision: ${command.decision.replace(/_/g, ' ').toUpperCase()} by ${command.reviewerDisplayName} (${command.reviewerRole}). Notes: ${command.reviewerNotes || 'None'}`,
      occurredAt: nowIso,
    };

    return ok({
      updatedSubmission,
      publishedQuestion,
      auditEntry,
    });
  }
}
