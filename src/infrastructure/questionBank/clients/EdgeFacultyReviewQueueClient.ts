import { ok, err, type Result } from '../../../domain/shared/result.ts';
import type { BlockId } from '../../../domain/model/types.ts';
import type {
  IFacultyReviewQueuePort,
  GovernedQuestion,
  QuestionReviewSubmission,
  EditorialDecisionCommand,
  EditorialAuditLogEntry,
  BankRevisionNumber,
  QuestionBankDomainError,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionEditorialStateMachine } from '../../../domain/questionBank/editorialStateMachine.ts';
import type { LocalBankStorageSimulator } from './LocalBankStorageSimulator.ts';

export class EdgeFacultyReviewQueueClient implements IFacultyReviewQueuePort {
  constructor(private simulator: LocalBankStorageSimulator) {}

  public async listReviewQueue(blockId: BlockId = 'cvs'): Promise<Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>> {
    const localQueue = this.simulator.getLocalSubmissions(blockId);

    try {
      const res = await fetch(`/api/admin/questions/review-queue?block=${encodeURIComponent(blockId)}`);
      if (res.ok) {
        const remoteQueue = (await res.json()) as QuestionReviewSubmission[];
        if (remoteQueue.length > 0) {
          const map = new Map<string, QuestionReviewSubmission>();
          localQueue.forEach((t) => map.set(t.ticketId, t));
          remoteQueue.forEach((t) => map.set(t.ticketId, t));
          const merged = Array.from(map.values());
          this.simulator.saveLocalSubmissions(blockId, merged);
          return ok(merged);
        }
      }
    } catch {
      // Fall through
    }

    return ok(localQueue);
  }

  public async submitReviewDecision(
    command: EditorialDecisionCommand
  ): Promise<
    Result<
      {
        readonly updatedSubmission: QuestionReviewSubmission;
        readonly publishedQuestion: GovernedQuestion | null;
        readonly auditEntry: EditorialAuditLogEntry;
        readonly newBlockRevision: BankRevisionNumber;
      },
      QuestionBankDomainError
    >
  > {
    const blockId: BlockId =
      (command as EditorialDecisionCommand & { blockId?: BlockId }).blockId || 'cvs';
    const submissions = this.simulator.getLocalSubmissions(blockId);
    const targetIdx = submissions.findIndex(
      (s) => s.ticketId === command.ticketId || s.question.id === command.questionId
    );

    // 1. Try remote worker first
    let remoteSuccessData: {
      updatedSubmission: QuestionReviewSubmission;
      publishedQuestion?: GovernedQuestion | null;
      auditEntry: EditorialAuditLogEntry;
      newBlockRevision?: number;
    } | null = null;
    try {
      const res = await fetch(`/api/admin/questions/${encodeURIComponent(command.questionId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.updatedSubmission) {
          remoteSuccessData = data;
        }
      }
    } catch {
      // Offline / local simulator
    }

    if (targetIdx === -1 && !remoteSuccessData) {
      return err({
        code: 'QUESTION_NOT_FOUND',
        questionId: command.questionId,
      });
    }

    const nextRevision = remoteSuccessData?.newBlockRevision
      ? this.simulator.setLocalRevision(blockId, Math.max(Number(this.simulator.getLocalRevision(blockId)) + 1, Number(remoteSuccessData.newBlockRevision)))
      : ((Number(this.simulator.getLocalRevision(blockId)) + 1) as BankRevisionNumber);

    if (targetIdx !== -1) {
      const currentSub = submissions[targetIdx];
      const transitionResult = QuestionEditorialStateMachine.transition(currentSub, command, nextRevision);
      if (!transitionResult.ok) {
        return transitionResult;
      }

      const { updatedSubmission, publishedQuestion, auditEntry } = transitionResult.value;
      submissions[targetIdx] = updatedSubmission;
      this.simulator.saveLocalSubmissions(blockId, submissions);

      if (publishedQuestion) {
        const canonical = this.simulator.getLocalCanonicalBank(blockId);
        const existingIdx = canonical.findIndex((q) => q.id === publishedQuestion.id);
        if (existingIdx >= 0) {
          canonical[existingIdx] = publishedQuestion;
        } else {
          canonical.push(publishedQuestion);
        }
        this.simulator.saveLocalCanonicalBank(blockId, canonical);
        this.simulator.setLocalRevision(blockId, Number(nextRevision));
        this.simulator.broadcastGlobalBankMutation(blockId, Number(nextRevision));
      }

      this.simulator.appendLocalAuditLog(blockId, auditEntry);

      return ok({
        updatedSubmission,
        publishedQuestion,
        auditEntry,
        newBlockRevision: nextRevision,
      });
    }

    // If only existed on remote
    if (!remoteSuccessData) {
      return err({
        code: 'QUESTION_NOT_FOUND',
        questionId: command.questionId,
      });
    }
    if (remoteSuccessData.publishedQuestion) {
      const publishedRemote = remoteSuccessData.publishedQuestion;
      const canonical = this.simulator.getLocalCanonicalBank(blockId);
      const existingIdx = canonical.findIndex((q) => q.id === publishedRemote.id);
      if (existingIdx >= 0) {
        canonical[existingIdx] = publishedRemote;
      } else {
        canonical.push(publishedRemote);
      }
      this.simulator.saveLocalCanonicalBank(blockId, canonical);
      this.simulator.broadcastGlobalBankMutation(blockId, Number(nextRevision));
    }

    return ok({
      updatedSubmission: remoteSuccessData.updatedSubmission,
      publishedQuestion: remoteSuccessData.publishedQuestion || null,
      auditEntry: remoteSuccessData.auditEntry,
      newBlockRevision: nextRevision,
    });
  }
}
