import { ok, err, type Result } from '../../../domain/shared/result.ts';
import type {
  BlockId,
  QuestionId,
  Question,
} from '../../../domain/model/types.ts';
import type {
  IStudioProposalSubmissionPort,
  GovernedQuestion,
  QuestionReviewSubmission,
  EditorialAuditLogEntry,
  SubmissionTicketId,
  QuestionBankDomainError,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionCanonicalHasher } from '../../../domain/questionBank/canonicalHasher.ts';
import type { QuestionQualityGatePipeline } from '../../../domain/questionBank/qualityGatePipeline.ts';
import type { LocalBankStorageSimulator } from './LocalBankStorageSimulator.ts';

export class EdgeProposalSubmissionClient implements IStudioProposalSubmissionPort {
  constructor(
    private simulator: LocalBankStorageSimulator,
    private qualityPipeline: QuestionQualityGatePipeline
  ) {}

  public async submitQuestionsForGlobalReview(params: {
    readonly questions: readonly Question[];
    readonly authorId: string;
    readonly authorDisplayName: string;
    readonly authorRole: EditorialAuditLogEntry['actorRole'];
    readonly allowDuplicateStems?: boolean;
    readonly reviewerNotes?: string;
  }): Promise<
    Result<
      {
        readonly submittedTickets: readonly QuestionReviewSubmission[];
        readonly duplicateQuestionIds: readonly QuestionId[];
      },
      QuestionBankDomainError
    >
  > {
    const { questions, authorId, authorDisplayName, authorRole, allowDuplicateStems, reviewerNotes } = params;

    // Quality Gate Ingestion
    const validation = this.qualityPipeline.validateBatch(questions);
    if (validation.errors.length > 0) {
      return err(validation.errors[0]);
    }

    // Local Simulator + Remote Worker Dual-Write
    const blockId = (questions[0]?.blockId as BlockId) || 'cvs';
    const currentSubmissions = this.simulator.getLocalSubmissions(blockId);
    const currentCanonical = this.simulator.getLocalCanonicalBank(blockId);

    const duplicateQuestionIds: QuestionId[] = [];
    const submittedTickets: QuestionReviewSubmission[] = [];

    const existingStemHashes = new Set<string>([
      ...currentCanonical.map((q) => q.stemHash),
      ...currentSubmissions.map((s) => s.question.stemHash),
    ]);

    const nowIso = new Date().toISOString();

    for (const q of validation.validQuestions) {
      const stemHash = validation.stemHashes.get(q.id) || QuestionCanonicalHasher.computeStemHashSync(q.stem);

      if (existingStemHashes.has(stemHash) && !allowDuplicateStems) {
        duplicateQuestionIds.push(q.id);
        continue;
      }

      existingStemHashes.add(stemHash);

      const governedItem: GovernedQuestion = {
        ...q,
        provenanceScope: 'submitted-pending',
        editorialStatus: 'pending_review',
        stemHash,
        globalRevision: 1,
        authorId,
        authorDisplayName,
        reviewedById: null,
        reviewedByDisplayName: null,
        reviewerNotes: reviewerNotes || null,
        publishedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const ticket: QuestionReviewSubmission = {
        ticketId: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` as SubmissionTicketId,
        question: governedItem,
        submittedByUserId: authorId,
        submittedByDisplayName: authorDisplayName,
        submittedByRole: authorRole,
        submittedAt: nowIso,
        editorialStatus: 'pending_review',
        reviewedByUserId: null,
        reviewedByDisplayName: null,
        reviewedAt: null,
        reviewerNotes: reviewerNotes || null,
      };

      submittedTickets.push(ticket);
    }

    this.simulator.saveLocalSubmissions(blockId, [...submittedTickets, ...currentSubmissions]);

    if (submittedTickets.length > 0) {
      this.simulator.appendLocalAuditLog(blockId, {
        id: `audit-${Date.now()}` as EditorialAuditLogEntry['id'],
        questionId: submittedTickets[0].question.id,
        blockId,
        action: 'SUBMISSION_CREATED',
        actorUserId: authorId,
        actorDisplayName: authorDisplayName,
        actorRole: authorRole,
        previousStatus: 'local_draft',
        nextStatus: 'pending_review',
        revisionAfter: this.simulator.getLocalRevision(blockId),
        summary: `Author ${authorDisplayName} submitted ${submittedTickets.length} question(s) for curriculum review.`,
        occurredAt: nowIso,
      });
    }

    // Mirror to remote worker if reachable
    try {
      const res = await fetch('/api/bank/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: validation.validQuestions,
          authorId,
          authorDisplayName,
          authorRole,
        }),
      });
      if (res.ok) {
        const remoteData = await res.json();
        if (remoteData.submittedTickets && remoteData.submittedTickets.length > 0) {
          return ok(remoteData);
        }
      }
    } catch {
      // Offline / local simulator handled above
    }

    return ok({
      submittedTickets,
      duplicateQuestionIds,
    });
  }

  public async listMySubmissions(authorId: string): Promise<Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>> {
    const localItems = this.simulator.getLocalSubmissions('cvs').filter((s) => s.submittedByUserId === authorId);

    try {
      const res = await fetch(`/api/bank/submissions/my?authorId=${encodeURIComponent(authorId)}`);
      if (res.ok) {
        const remoteItems = (await res.json()) as QuestionReviewSubmission[];
        if (remoteItems.length > 0) {
          const map = new Map<string, QuestionReviewSubmission>();
          localItems.forEach((item) => map.set(item.ticketId, item));
          remoteItems.forEach((item) => map.set(item.ticketId, item));
          return ok(Array.from(map.values()));
        }
      }
    } catch {
      // Fall through to local
    }

    return ok(localItems);
  }
}
