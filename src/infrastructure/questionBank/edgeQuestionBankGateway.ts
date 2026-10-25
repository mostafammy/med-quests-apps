/**
 * Infrastructure Gateway: Edge Question Bank & Governance Gateway
 * Layer: Infrastructure (Implements Hexagonal Ports with Remote Worker + Deterministic Local Simulator)
 */

import { ok, err, type Result } from '../../domain/shared/result.ts';
import type {
  BlockId,
  QuestionId,
  Question,
} from '../../domain/model/types.ts';
import type {
  IDownstreamBankSyncPort,
  IStudioProposalSubmissionPort,
  IFacultyReviewQueuePort,
  ICanonicalBankCuratorPort,
  BankSyncCursor,
  BankDeltaSyncResponse,
  GovernedQuestion,
  QuestionReviewSubmission,
  EditorialDecisionCommand,
  EditorialAuditLogEntry,
  GlobalBankGovernanceKpis,
  QuestionBankDomainError,
  BankRevisionNumber,
  SubmissionTicketId,
  QuestionMutationPatch,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionCanonicalHasher } from '../../domain/questionBank/canonicalHasher.ts';
import { QuestionEditorialStateMachine } from '../../domain/questionBank/editorialStateMachine.ts';
import { QuestionQualityGatePipeline } from '../../domain/questionBank/qualityGatePipeline.ts';
import { computeGlobalBankKpis } from '../../domain/questionBank/questionSpecifications.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';

const STORAGE_KEYS = {
  CANONICAL_BANK: 'medquests_global_canonical_bank_v2',
  REVIEW_SUBMISSIONS: 'medquests_global_review_submissions_v2',
  EDITORIAL_AUDIT_LOGS: 'medquests_global_editorial_audit_logs_v2',
  BLOCK_REVISIONS: 'medquests_global_block_revisions_v2',
} as const;

export class EdgeQuestionBankGateway
  implements
    IDownstreamBankSyncPort,
    IStudioProposalSubmissionPort,
    IFacultyReviewQueuePort,
    ICanonicalBankCuratorPort
{
  private qualityPipeline = new QuestionQualityGatePipeline();

  // =========================================================================
  // LOCAL SIMULATOR STORAGE HELPERS (Guarantees 100% offline & local demo testability)
  // =========================================================================
  private getLocalCanonicalBank(blockId: BlockId = 'cvs'): GovernedQuestion[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.CANONICAL_BANK}_${blockId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }

    // Seed from default bundled bank if empty
    if (Array.isArray(defaultCvsBank)) {
      const seeded: GovernedQuestion[] = (defaultCvsBank as Question[]).map((q) => ({
        ...q,
        provenanceScope: 'seed-bundled',
        editorialStatus: 'published',
        stemHash: QuestionCanonicalHasher.computeStemHashSync(q.stem),
        globalRevision: 1,
        authorId: 'usr-curriculum-faculty',
        authorDisplayName: 'Curriculum Faculty Committee',
        reviewedById: 'usr-admin-initial',
        reviewedByDisplayName: 'Board Administrator',
        reviewerNotes: 'Official faculty syllabus verified item.',
        publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      }));
      this.saveLocalCanonicalBank(blockId, seeded);
      return seeded;
    }

    return [];
  }

  private saveLocalCanonicalBank(blockId: BlockId, questions: readonly GovernedQuestion[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_KEYS.CANONICAL_BANK}_${blockId}`, JSON.stringify(questions));
    } catch {
      // Storage full
    }
  }

  private getLocalSubmissions(blockId: BlockId = 'cvs'): QuestionReviewSubmission[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.REVIEW_SUBMISSIONS}_${blockId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return [];
  }

  private saveLocalSubmissions(blockId: BlockId, list: readonly QuestionReviewSubmission[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_KEYS.REVIEW_SUBMISSIONS}_${blockId}`, JSON.stringify(list));
    } catch {
      // Storage full
    }
  }

  private getLocalAuditLogs(blockId: BlockId = 'cvs'): EditorialAuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.EDITORIAL_AUDIT_LOGS}_${blockId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return [];
  }

  private appendLocalAuditLog(blockId: BlockId, entry: EditorialAuditLogEntry): void {
    const current = this.getLocalAuditLogs(blockId);
    const updated = [entry, ...current].slice(0, 200);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEYS.EDITORIAL_AUDIT_LOGS}_${blockId}`, JSON.stringify(updated));
      } catch {
        // Storage full
      }
    }
  }

  private getLocalRevision(blockId: BlockId = 'cvs'): BankRevisionNumber {
    if (typeof window === 'undefined') return 1 as BankRevisionNumber;
    try {
      const rev = localStorage.getItem(`${STORAGE_KEYS.BLOCK_REVISIONS}_${blockId}`);
      return (rev ? Number(rev) : 1) as BankRevisionNumber;
    } catch {
      return 1 as BankRevisionNumber;
    }
  }

  private bumpLocalRevision(blockId: BlockId = 'cvs'): BankRevisionNumber {
    const next = (Number(this.getLocalRevision(blockId)) + 1) as BankRevisionNumber;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEYS.BLOCK_REVISIONS}_${blockId}`, String(next));
      } catch {
        // Ignore
      }
    }
    return next;
  }

  // =========================================================================
  // PORT 1: IDownstreamBankSyncPort (Student & All Users Read-Only Sync)
  // =========================================================================
  public async fetchDeltaSync(
    blockId: BlockId,
    cursor: BankSyncCursor | null,
    signal?: AbortSignal
  ): Promise<Result<BankDeltaSyncResponse, QuestionBankDomainError>> {
    // 1. Try remote Cloudflare Worker edge endpoint
    try {
      const sinceRev = cursor ? cursor.serverRevision : 0;
      const headers: Record<string, string> = {};
      if (cursor?.etag) {
        headers['If-None-Match'] = cursor.etag;
      }

      const res = await fetch(`/api/bank/sync?block=${encodeURIComponent(blockId)}&sinceRev=${sinceRev}`, {
        method: 'GET',
        headers,
        signal,
      });

      if (res.status === 304) {
        return ok({
          status: 'up-to-date',
          blockId,
          revision: (cursor?.serverRevision || 1) as BankRevisionNumber,
          syncedAt: new Date().toISOString(),
          etag: cursor?.etag || 'W/rev-1',
          upsertedQuestions: [],
          archivedQuestionIds: [],
        });
      }

      if (res.ok) {
        const data = await res.json();
        return ok(data);
      }
    } catch {
      // Fall through to deterministic local simulator
    }

    // 2. Deterministic Local Simulator
    const localCanonical = this.getLocalCanonicalBank(blockId);
    const localRev = this.getLocalRevision(blockId);
    const clientRev = cursor?.serverRevision || 0;

    if (clientRev >= localRev && cursor?.etag === `W/rev-${localRev}`) {
      return ok({
        status: 'up-to-date',
        blockId,
        revision: localRev,
        syncedAt: new Date().toISOString(),
        etag: `W/rev-${localRev}`,
        upsertedQuestions: [],
        archivedQuestionIds: [],
      });
    }

    const activePublished = localCanonical.filter((q) => q.editorialStatus === 'published');
    const archivedIds = localCanonical
      .filter((q) => q.editorialStatus === 'archived')
      .map((q) => q.id);

    return ok({
      status: 'delta-applied',
      blockId,
      revision: localRev,
      syncedAt: new Date().toISOString(),
      etag: `W/rev-${localRev}`,
      upsertedQuestions: activePublished,
      archivedQuestionIds: archivedIds,
    });
  }

  // =========================================================================
  // PORT 2: IStudioProposalSubmissionPort (Authoring & Review Staging)
  // =========================================================================
  public async submitQuestionsForGlobalReview(params: {
    readonly questions: readonly Question[];
    readonly authorId: string;
    readonly authorDisplayName: string;
    readonly authorRole: any;
  }): Promise<
    Result<
      {
        readonly submittedTickets: readonly QuestionReviewSubmission[];
        readonly duplicateQuestionIds: readonly QuestionId[];
      },
      QuestionBankDomainError
    >
  > {
    const { questions, authorId, authorDisplayName, authorRole } = params;

    // Quality Gate Ingestion
    const validation = this.qualityPipeline.validateBatch(questions);
    if (validation.errors.length > 0) {
      return err(validation.errors[0]);
    }

    // Remote worker call if available
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
        const data = await res.json();
        return ok(data);
      }
    } catch {
      // Fall through to local simulator
    }

    // Local Simulator Implementation
    const blockId = (questions[0]?.blockId as BlockId) || 'cvs';
    const currentSubmissions = this.getLocalSubmissions(blockId);
    const currentCanonical = this.getLocalCanonicalBank(blockId);

    const duplicateQuestionIds: QuestionId[] = [];
    const submittedTickets: QuestionReviewSubmission[] = [];

    const existingStemHashes = new Set<string>([
      ...currentCanonical.map((q) => q.stemHash),
      ...currentSubmissions.map((s) => s.question.stemHash),
    ]);

    const nowIso = new Date().toISOString();

    for (const q of validation.validQuestions) {
      const stemHash = validation.stemHashes.get(q.id) || QuestionCanonicalHasher.computeStemHashSync(q.stem);

      if (existingStemHashes.has(stemHash)) {
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
        reviewerNotes: null,
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
        reviewerNotes: null,
      };

      submittedTickets.push(ticket);
    }

    this.saveLocalSubmissions(blockId, [...submittedTickets, ...currentSubmissions]);

    // Record audit event for submitted batch
    if (submittedTickets.length > 0) {
      this.appendLocalAuditLog(blockId, {
        id: `audit-${Date.now()}` as any,
        questionId: submittedTickets[0].question.id,
        blockId,
        action: 'SUBMISSION_CREATED',
        actorUserId: authorId,
        actorDisplayName: authorDisplayName,
        actorRole: authorRole,
        previousStatus: 'local_draft',
        nextStatus: 'pending_review',
        revisionAfter: this.getLocalRevision(blockId),
        summary: `Author ${authorDisplayName} submitted ${submittedTickets.length} question(s) for curriculum review.`,
        occurredAt: nowIso,
      });
    }

    return ok({
      submittedTickets,
      duplicateQuestionIds,
    });
  }

  public async listMySubmissions(authorId: string): Promise<Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>> {
    try {
      const res = await fetch(`/api/bank/submissions/my?authorId=${encodeURIComponent(authorId)}`);
      if (res.ok) {
        const data = await res.json();
        return ok(data);
      }
    } catch {
      // Fall through to local
    }

    const allSubmissions = this.getLocalSubmissions('cvs');
    const myItems = allSubmissions.filter((s) => s.submittedByUserId === authorId);
    return ok(myItems);
  }

  // =========================================================================
  // PORT 3: IFacultyReviewQueuePort (Faculty Review & Triage)
  // =========================================================================
  public async listReviewQueue(blockId: BlockId = 'cvs'): Promise<Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>> {
    try {
      const res = await fetch(`/api/admin/questions/review-queue?block=${encodeURIComponent(blockId)}`);
      if (res.ok) {
        const data = await res.json();
        return ok(data);
      }
    } catch {
      // Fall through
    }

    return ok(this.getLocalSubmissions(blockId));
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
    try {
      const res = await fetch(`/api/admin/questions/${encodeURIComponent(command.questionId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (res.ok) {
        const data = await res.json();
        return ok(data);
      }
    } catch {
      // Fall through
    }

    // Local Simulator
    const blockId = 'cvs';
    const submissions = this.getLocalSubmissions(blockId);
    const targetIdx = submissions.findIndex((s) => s.ticketId === command.ticketId || s.question.id === command.questionId);

    if (targetIdx === -1) {
      return err({
        code: 'QUESTION_NOT_FOUND',
        questionId: command.questionId,
      });
    }

    const currentSub = submissions[targetIdx];
    const nextRevision = (Number(this.getLocalRevision(blockId)) + 1) as BankRevisionNumber;

    const transitionResult = QuestionEditorialStateMachine.transition(currentSub, command, nextRevision);
    if (!transitionResult.ok) {
      return transitionResult;
    }

    const { updatedSubmission, publishedQuestion, auditEntry } = transitionResult.value;

    // Update submissions list
    submissions[targetIdx] = updatedSubmission;
    this.saveLocalSubmissions(blockId, submissions);

    // If published, add to Canonical Bank and bump revision!
    if (publishedQuestion) {
      const canonical = this.getLocalCanonicalBank(blockId);
      const existingIdx = canonical.findIndex((q) => q.id === publishedQuestion.id);
      if (existingIdx >= 0) {
        canonical[existingIdx] = publishedQuestion;
      } else {
        canonical.push(publishedQuestion);
      }
      this.saveLocalCanonicalBank(blockId, canonical);
      this.bumpLocalRevision(blockId);
    }

    this.appendLocalAuditLog(blockId, auditEntry);

    return ok({
      updatedSubmission,
      publishedQuestion,
      auditEntry,
      newBlockRevision: nextRevision,
    });
  }

  // =========================================================================
  // PORT 4: ICanonicalBankCuratorPort (Canonical CRUD & Errata Management)
  // =========================================================================
  public async listGlobalBankCatalog(blockId: BlockId = 'cvs'): Promise<
    Result<
      {
        readonly questions: readonly GovernedQuestion[];
        readonly auditLogs: readonly EditorialAuditLogEntry[];
        readonly kpis: GlobalBankGovernanceKpis;
      },
      QuestionBankDomainError
    >
  > {
    try {
      const res = await fetch(`/api/admin/questions/catalog?block=${encodeURIComponent(blockId)}`);
      if (res.ok) {
        const data = await res.json();
        return ok(data);
      }
    } catch {
      // Fall through
    }

    const questions = this.getLocalCanonicalBank(blockId);
    const auditLogs = this.getLocalAuditLogs(blockId);
    const currentRev = this.getLocalRevision(blockId);
    const kpis = computeGlobalBankKpis(questions, currentRev);

    return ok({
      questions,
      auditLogs,
      kpis,
    });
  }

  public async createCanonicalQuestions(params: {
    readonly questions: readonly Question[];
    readonly actorId: string;
    readonly actorDisplayName: string;
    readonly actorRole: any;
  }): Promise<
    Result<
      {
        readonly created: readonly GovernedQuestion[];
        readonly newBlockRevision: BankRevisionNumber;
      },
      QuestionBankDomainError
    >
  > {
    const { questions, actorId, actorDisplayName, actorRole } = params;
    const validation = this.qualityPipeline.validateBatch(questions);
    if (validation.errors.length > 0) {
      return err(validation.errors[0]);
    }

    try {
      const res = await fetch('/api/admin/questions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return ok(await res.json());
      }
    } catch {
      // Fall through
    }

    const blockId = (questions[0]?.blockId as BlockId) || 'cvs';
    const canonical = this.getLocalCanonicalBank(blockId);
    const nextRev = this.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();

    const created: GovernedQuestion[] = validation.validQuestions.map((q) => ({
      ...q,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: validation.stemHashes.get(q.id) || QuestionCanonicalHasher.computeStemHashSync(q.stem),
      globalRevision: nextRev,
      authorId: actorId,
      authorDisplayName: actorDisplayName,
      reviewedById: actorId,
      reviewedByDisplayName: actorDisplayName,
      reviewerNotes: 'Directly authored by Faculty/Admin.',
      publishedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const updatedCatalog = [...canonical, ...created];
    this.saveLocalCanonicalBank(blockId, updatedCatalog);

    this.appendLocalAuditLog(blockId, {
      id: `audit-${Date.now()}` as any,
      questionId: created[0].id,
      blockId,
      action: 'CANONICAL_QUESTION_CREATED',
      actorUserId: actorId,
      actorDisplayName,
      actorRole,
      previousStatus: null,
      nextStatus: 'published',
      revisionAfter: nextRev,
      summary: `Created ${created.length} canonical questions directly in the Global Bank.`,
      occurredAt: nowIso,
    });

    return ok({
      created,
      newBlockRevision: nextRev,
    });
  }

  public async updateCanonicalQuestion(params: {
    readonly questionId: QuestionId;
    readonly patch: QuestionMutationPatch;
    readonly actorId: string;
    readonly actorDisplayName: string;
    readonly actorRole: any;
    readonly changeReason: string;
  }): Promise<
    Result<
      {
        readonly updatedQuestion: GovernedQuestion;
        readonly auditEntry: EditorialAuditLogEntry;
        readonly newBlockRevision: BankRevisionNumber;
      },
      QuestionBankDomainError
    >
  > {
    const { questionId, patch, actorId, actorDisplayName, actorRole, changeReason } = params;

    try {
      const res = await fetch(`/api/admin/questions/canonical/${encodeURIComponent(questionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return ok(await res.json());
      }
    } catch {
      // Fall through
    }

    const blockId = 'cvs';
    const canonical = this.getLocalCanonicalBank(blockId);
    const idx = canonical.findIndex((q) => q.id === questionId);

    if (idx === -1) {
      return err({ code: 'QUESTION_NOT_FOUND', questionId });
    }

    const existing = canonical[idx];
    const nextRev = this.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();

    const stemHash = patch.stem
      ? QuestionCanonicalHasher.computeStemHashSync(patch.stem)
      : existing.stemHash;

    const updatedQuestion: GovernedQuestion = {
      ...existing,
      ...patch,
      stemHash,
      bankVersion: existing.bankVersion + 1,
      globalRevision: nextRev,
      reviewedById: actorId,
      reviewedByDisplayName: actorDisplayName,
      reviewerNotes: `Update reason: ${changeReason}`,
      updatedAt: nowIso,
    };

    canonical[idx] = updatedQuestion;
    this.saveLocalCanonicalBank(blockId, canonical);

    const auditEntry: EditorialAuditLogEntry = {
      id: `audit-${Date.now()}` as any,
      questionId,
      blockId,
      action: 'CANONICAL_QUESTION_UPDATED',
      actorUserId: actorId,
      actorDisplayName,
      actorRole,
      previousStatus: existing.editorialStatus,
      nextStatus: updatedQuestion.editorialStatus,
      revisionAfter: nextRev,
      summary: `Updated canonical question: ${changeReason}`,
      occurredAt: nowIso,
    };

    this.appendLocalAuditLog(blockId, auditEntry);

    return ok({
      updatedQuestion,
      auditEntry,
      newBlockRevision: nextRev,
    });
  }

  public async setCanonicalArchiveStatus(params: {
    readonly questionId: QuestionId;
    readonly archive: boolean;
    readonly actorId: string;
    readonly actorDisplayName: string;
    readonly actorRole: any;
    readonly reason: string;
  }): Promise<
    Result<
      {
        readonly updatedQuestion: GovernedQuestion;
        readonly auditEntry: EditorialAuditLogEntry;
        readonly newBlockRevision: BankRevisionNumber;
      },
      QuestionBankDomainError
    >
  > {
    const { questionId, archive, actorId, actorDisplayName, actorRole, reason } = params;

    try {
      const res = await fetch(`/api/admin/questions/canonical/${encodeURIComponent(questionId)}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return ok(await res.json());
      }
    } catch {
      // Fall through
    }

    const blockId = 'cvs';
    const canonical = this.getLocalCanonicalBank(blockId);
    const idx = canonical.findIndex((q) => q.id === questionId);

    if (idx === -1) {
      return err({ code: 'QUESTION_NOT_FOUND', questionId });
    }

    const existing = canonical[idx];
    const nextRev = this.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();
    const nextStatus = archive ? 'archived' : 'published';

    const updatedQuestion: GovernedQuestion = {
      ...existing,
      editorialStatus: nextStatus,
      status: archive ? 'quarantined' : 'active',
      globalRevision: nextRev,
      updatedAt: nowIso,
    };

    canonical[idx] = updatedQuestion;
    this.saveLocalCanonicalBank(blockId, canonical);

    const auditEntry: EditorialAuditLogEntry = {
      id: `audit-${Date.now()}` as any,
      questionId,
      blockId,
      action: archive ? 'CANONICAL_QUESTION_ARCHIVED' : 'CANONICAL_QUESTION_RESTORED',
      actorUserId: actorId,
      actorDisplayName,
      actorRole,
      previousStatus: existing.editorialStatus,
      nextStatus,
      revisionAfter: nextRev,
      summary: `${archive ? 'Archived' : 'Restored'} question. Reason: ${reason}`,
      occurredAt: nowIso,
    };

    this.appendLocalAuditLog(blockId, auditEntry);

    return ok({
      updatedQuestion,
      auditEntry,
      newBlockRevision: nextRev,
    });
  }
}

export const edgeQuestionBankGateway = new EdgeQuestionBankGateway();
