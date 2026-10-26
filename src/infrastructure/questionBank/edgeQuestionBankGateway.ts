/**
 * Infrastructure Gateway: Edge Question Bank & Governance Gateway
 * Layer: Infrastructure (Implements Hexagonal Ports with Remote Worker + Deterministic Local Simulator)
 *
 * Dual-Write & Version-Coherent Architecture:
 * Every mutation writes to Remote D1 (if online) AND mirrors to the Local Simulator
 * with synchronized monotonically increasing revision numbers so offline/online/cross-tab
 * queries never return stale or divergent revisions.
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
  SEED_CATALOG_SIZE: 'medquests_global_seed_size_v2',
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
  public getLocalCanonicalBank(blockId: BlockId = 'cvs'): GovernedQuestion[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.CANONICAL_BANK}_${blockId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as GovernedQuestion[];
        // If bundled seed bank grew (e.g. 106 questions ingested), merge any missing bundled seed items
        // AND bump the global block revision so clients never see "Local v6.0 -> Global v6.0" with +106 additions!
        if (blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
          const existingIds = new Set(parsed.map((q) => q.id));
          const missingSeeds = (defaultCvsBank as Question[]).filter((q) => !existingIds.has(q.id));
          const recordedSeedSizeRaw = localStorage.getItem(`${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`);
          const recordedSeedSize = recordedSeedSizeRaw ? Number(recordedSeedSizeRaw) : 0;

          if (missingSeeds.length > 0) {
            const nextRev = Number(this.bumpLocalRevision(blockId));
            for (const seedQ of missingSeeds) {
              parsed.push(this.enrichSeedQuestion(seedQ, nextRev));
            }
            localStorage.setItem(
              `${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`,
              String(defaultCvsBank.length)
            );
            this.saveLocalCanonicalBank(blockId, parsed);
          } else if (recordedSeedSize !== defaultCvsBank.length) {
            // Record current seed catalog size
            localStorage.setItem(
              `${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`,
              String(defaultCvsBank.length)
            );
          }
        }
        return parsed;
      }
    } catch {
      // Ignore
    }

    // Seed from default bundled bank if empty
    if (Array.isArray(defaultCvsBank)) {
      const initialRev = Number(this.getLocalRevision(blockId));
      const seeded: GovernedQuestion[] = (defaultCvsBank as Question[]).map((q) =>
        this.enrichSeedQuestion(q, initialRev)
      );
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `${STORAGE_KEYS.SEED_CATALOG_SIZE}_${blockId}`,
            String(defaultCvsBank.length)
          );
        } catch {
          // Ignore
        }
      }
      this.saveLocalCanonicalBank(blockId, seeded);
      return seeded;
    }

    return [];
  }

  private enrichSeedQuestion(q: Question, globalRevision = 1): GovernedQuestion {
    return {
      ...q,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      stemHash: QuestionCanonicalHasher.computeStemHashSync(q.stem),
      globalRevision,
      authorId: 'usr-curriculum-faculty',
      authorDisplayName: 'Curriculum Faculty Committee',
      reviewedById: 'usr-admin-initial',
      reviewedByDisplayName: 'Board Administrator',
      reviewerNotes: 'Official faculty syllabus verified item.',
      publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    };
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

  public getLocalRevision(blockId: BlockId = 'cvs'): BankRevisionNumber {
    if (typeof window === 'undefined') return 1 as BankRevisionNumber;
    try {
      const rev = localStorage.getItem(`${STORAGE_KEYS.BLOCK_REVISIONS}_${blockId}`);
      return (rev ? Number(rev) : 1) as BankRevisionNumber;
    } catch {
      return 1 as BankRevisionNumber;
    }
  }

  private setLocalRevision(blockId: BlockId, rev: number): BankRevisionNumber {
    const validRev = Math.max(1, rev) as BankRevisionNumber;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEYS.BLOCK_REVISIONS}_${blockId}`, String(validRev));
      } catch {
        // Ignore
      }
    }
    return validRev;
  }

  private bumpLocalRevision(blockId: BlockId = 'cvs'): BankRevisionNumber {
    const next = Number(this.getLocalRevision(blockId)) + 1;
    return this.setLocalRevision(blockId, next);
  }

  public ensureMinimumLocalRevision(blockId: BlockId = 'cvs', minRev: number): BankRevisionNumber {
    const current = Number(this.getLocalRevision(blockId));
    if (minRev > current) {
      return this.setLocalRevision(blockId, minRev);
    }
    return current as BankRevisionNumber;
  }

  private broadcastGlobalBankMutation(blockId: BlockId, newRevision: number): void {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('medquests_bank_sync');
          channel.postMessage({
            type: 'GLOBAL_BANK_MUTATED',
            blockId,
            revision: newRevision,
            timestamp: new Date().toISOString(),
          });
          channel.close();
        } catch {
          // Ignore
        }
      }
      try {
        window.dispatchEvent(
          new CustomEvent('medquests:global-bank-mutated', {
            detail: { blockId, revision: newRevision },
          })
        );
      } catch {
        // Ignore
      }
    }
  }

  // =========================================================================
  // PORT 1: IDownstreamBankSyncPort (Student & All Users Read-Only Sync)
  // =========================================================================
  public async fetchDeltaSync(
    blockId: BlockId,
    cursor: BankSyncCursor | null,
    signal?: AbortSignal
  ): Promise<Result<BankDeltaSyncResponse, QuestionBankDomainError>> {
    const localCanonical = this.getLocalCanonicalBank(blockId);
    const localRev = this.getLocalRevision(blockId);
    const clientRev = cursor ? Number(cursor.serverRevision) : 0;

    // 1. Try remote Cloudflare Worker edge endpoint
    try {
      const sinceRev = cursor ? Number(cursor.serverRevision) : 0;
      const headers: Record<string, string> = {};
      if (cursor?.etag && sinceRev > 0) {
        headers['If-None-Match'] = cursor.etag;
      }

      const fetchPage = (offset: number) =>
        fetch(
          `/api/bank/sync?block=${encodeURIComponent(blockId)}&sinceRev=${sinceRev}&offset=${offset}`,
          {
            method: 'GET',
            headers: offset === 0 ? headers : {},
            signal,
          }
        );

      const res = await fetchPage(0);

      if (res.status === 304) {
        // Even if remote says 304, check if local simulator has a newer revision (e.g., admin edited in local dev mode)
        if (localRev <= clientRev) {
          return ok({
            status: 'up-to-date',
            blockId,
            revision: (cursor?.serverRevision || 1) as BankRevisionNumber,
            syncedAt: new Date().toISOString(),
            etag: cursor?.etag || `W/rev-${localRev}`,
            upsertedQuestions: [],
            archivedQuestionIds: [],
          });
        }
      } else if (res.ok) {
        let pageData = (await res.json()) as BankDeltaSyncResponse;
        const remoteRev = Number(pageData.revision || 1);

        // If remote has valid canonical updates and is >= local simulator revision, mirror & return it
        if (remoteRev >= localRev) {
          const upsertedMap = new Map<string, GovernedQuestion>();
          const archivedIds = new Set<string>();

          // Follow pagination so a large canonical bank is never mistaken for mass deletion.
          let pageOffset = 0;
          while (true) {
            (pageData.upsertedQuestions || []).forEach((q) => upsertedMap.set(q.id, q));
            (pageData.archivedQuestionIds || []).forEach((id) => archivedIds.add(id));

            if (!pageData.hasMore || pageData.nextOffset == null) break;

            pageOffset = pageData.nextOffset;
            const nextRes = await fetchPage(pageOffset);
            if (!nextRes.ok) {
              throw new Error(`Delta sync pagination failed at offset ${pageOffset}`);
            }
            pageData = (await nextRes.json()) as BankDeltaSyncResponse;
          }

          const combined: BankDeltaSyncResponse = {
            ...pageData,
            status:
              upsertedMap.size > 0 || archivedIds.size > 0 || sinceRev > 0
                ? 'delta-applied'
                : pageData.status,
            revision: remoteRev as BankRevisionNumber,
            upsertedQuestions: Array.from(upsertedMap.values()),
            archivedQuestionIds: Array.from(archivedIds) as QuestionId[],
            hasMore: false,
            nextOffset: undefined,
          };

          if (
            combined.upsertedQuestions.length > 0 ||
            combined.archivedQuestionIds.length > 0 ||
            sinceRev > 0
          ) {
            if (remoteRev > localRev) {
              this.setLocalRevision(blockId, remoteRev);
            }
            // Merge remote upserts into local canonical cache so local simulator stays coherent
            if (combined.upsertedQuestions.length > 0 || combined.archivedQuestionIds.length > 0) {
              const map = new Map<string, GovernedQuestion>();
              localCanonical.forEach((q) => map.set(q.id, q));
              combined.upsertedQuestions.forEach((q) => map.set(q.id, q));
              combined.archivedQuestionIds.forEach((id) => {
                const ex = map.get(id);
                if (ex) {
                  map.set(id, { ...ex, editorialStatus: 'archived', status: 'quarantined' });
                }
              });
              this.saveLocalCanonicalBank(blockId, Array.from(map.values()));
            }
            return ok(combined);
          }
        }
      }
    } catch {
      // Fall through to deterministic local simulator
    }

    // 2. Deterministic Local Simulator
    if (clientRev > 0 && clientRev >= localRev && cursor?.etag === `W/rev-${localRev}`) {
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

    // Filter questions modified after clientRev (or all published if clientRev === 0)
    const activePublished = localCanonical.filter(
      (q) => q.editorialStatus === 'published' && (clientRev === 0 || (q.globalRevision || 1) > clientRev)
    );
    const archivedIds = localCanonical
      .filter((q) => q.editorialStatus === 'archived')
      .map((q) => q.id);

    return ok({
      status:
        activePublished.length === 0 && archivedIds.length === 0 && clientRev >= localRev
          ? 'up-to-date'
          : 'delta-applied',
      blockId,
      revision: localRev,
      syncedAt: new Date().toISOString(),
      etag: `W/rev-${localRev}`,
      upsertedQuestions: activePublished,
      archivedQuestionIds: archivedIds,
    });
  }

  /**
   * Cheap revision probe used by the 60-second background pulse and focus revalidation.
   * Returns only revision + canonical count, never the full question payloads.
   */
  public async probeRemoteRevision(blockId: string): Promise<{
    readonly revision: number;
    readonly etag: string;
    readonly canonicalCount: number;
    readonly source: 'edge' | 'local';
  }> {
    const localRevision = Number(this.getLocalRevision(blockId) || 1);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), 4000)
      : null;

    try {
      const res = await fetch(
        `/api/bank/sync?block=${encodeURIComponent(blockId)}&probe=1`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller?.signal,
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          revision?: number;
          etag?: string;
          canonicalCount?: number;
        };
        if (typeof data.revision === 'number') {
          return {
            revision: data.revision,
            etag: data.etag || `W/rev-${data.revision}`,
            canonicalCount: Number(data.canonicalCount || 0),
            source: 'edge',
          };
        }
      }
    } catch {
      // Offline / local simulator fallback below.
    } finally {
      if (timer) clearTimeout(timer);
    }

    const localCanonical = this.getLocalCanonicalBank(blockId);
    return {
      revision: localRevision,
      etag: `W/rev-${localRevision}`,
      canonicalCount: localCanonical.filter((q) => q.editorialStatus === 'published').length,
      source: 'local',
    };
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

    // Local Simulator + Remote Worker Dual-Write
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
    const localItems = this.getLocalSubmissions('cvs').filter((s) => s.submittedByUserId === authorId);

    try {
      const res = await fetch(`/api/bank/submissions/my?authorId=${encodeURIComponent(authorId)}`);
      if (res.ok) {
        const remoteItems = (await res.json()) as QuestionReviewSubmission[];
        if (remoteItems.length > 0) {
          // Merge remote & local by ticketId
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

  // =========================================================================
  // PORT 3: IFacultyReviewQueuePort (Faculty Review & Triage)
  // =========================================================================
  public async listReviewQueue(blockId: BlockId = 'cvs'): Promise<Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>> {
    const localQueue = this.getLocalSubmissions(blockId);

    try {
      const res = await fetch(`/api/admin/questions/review-queue?block=${encodeURIComponent(blockId)}`);
      if (res.ok) {
        const remoteQueue = (await res.json()) as QuestionReviewSubmission[];
        if (remoteQueue.length > 0) {
          const map = new Map<string, QuestionReviewSubmission>();
          localQueue.forEach((t) => map.set(t.ticketId, t));
          remoteQueue.forEach((t) => map.set(t.ticketId, t));
          const merged = Array.from(map.values());
          this.saveLocalSubmissions(blockId, merged);
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
    const blockId: BlockId = 'cvs';
    const submissions = this.getLocalSubmissions(blockId);
    const targetIdx = submissions.findIndex(
      (s) => s.ticketId === command.ticketId || s.question.id === command.questionId
    );

    // 1. Try remote worker first
    let remoteSuccessData: any = null;
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
      ? this.setLocalRevision(blockId, Math.max(Number(this.getLocalRevision(blockId)) + 1, Number(remoteSuccessData.newBlockRevision)))
      : ((Number(this.getLocalRevision(blockId)) + 1) as BankRevisionNumber);

    if (targetIdx !== -1) {
      const currentSub = submissions[targetIdx];
      const transitionResult = QuestionEditorialStateMachine.transition(currentSub, command, nextRevision);
      if (!transitionResult.ok) {
        return transitionResult;
      }

      const { updatedSubmission, publishedQuestion, auditEntry } = transitionResult.value;
      submissions[targetIdx] = updatedSubmission;
      this.saveLocalSubmissions(blockId, submissions);

      if (publishedQuestion) {
        const canonical = this.getLocalCanonicalBank(blockId);
        const existingIdx = canonical.findIndex((q) => q.id === publishedQuestion.id);
        if (existingIdx >= 0) {
          canonical[existingIdx] = publishedQuestion;
        } else {
          canonical.push(publishedQuestion);
        }
        this.saveLocalCanonicalBank(blockId, canonical);
        this.setLocalRevision(blockId, Number(nextRevision));
        this.broadcastGlobalBankMutation(blockId, Number(nextRevision));
      }

      this.appendLocalAuditLog(blockId, auditEntry);

      return ok({
        updatedSubmission,
        publishedQuestion,
        auditEntry,
        newBlockRevision: nextRevision,
      });
    }

    // If only existed on remote
    if (remoteSuccessData.publishedQuestion) {
      const canonical = this.getLocalCanonicalBank(blockId);
      const existingIdx = canonical.findIndex((q) => q.id === remoteSuccessData.publishedQuestion.id);
      if (existingIdx >= 0) {
        canonical[existingIdx] = remoteSuccessData.publishedQuestion;
      } else {
        canonical.push(remoteSuccessData.publishedQuestion);
      }
      this.saveLocalCanonicalBank(blockId, canonical);
      this.broadcastGlobalBankMutation(blockId, Number(nextRevision));
    }

    return ok({
      updatedSubmission: remoteSuccessData.updatedSubmission,
      publishedQuestion: remoteSuccessData.publishedQuestion || null,
      auditEntry: remoteSuccessData.auditEntry,
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
    const localQuestions = this.getLocalCanonicalBank(blockId);
    const localLogs = this.getLocalAuditLogs(blockId);
    const localRev = this.getLocalRevision(blockId);

    try {
      const res = await fetch(`/api/admin/questions/catalog?block=${encodeURIComponent(blockId)}`);
      if (res.ok) {
        const remoteData = await res.json();
        const remoteRev = Number(remoteData.kpis?.currentBlockRevision || 1);
        if (Array.isArray(remoteData.questions) && remoteData.questions.length > 0 && remoteRev >= localRev) {
          this.saveLocalCanonicalBank(blockId, remoteData.questions);
          this.setLocalRevision(blockId, remoteRev);
          return ok(remoteData);
        }
      }
    } catch {
      // Fall through
    }

    const kpis = computeGlobalBankKpis(localQuestions, localRev);

    return ok({
      questions: localQuestions,
      auditLogs: localLogs,
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

    const blockId = (questions[0]?.blockId as BlockId) || 'cvs';
    const canonical = this.getLocalCanonicalBank(blockId);
    let nextRev = this.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();

    // Try remote worker
    try {
      const res = await fetch('/api/admin/questions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const remoteRes = await res.json();
        if (remoteRes.newBlockRevision) {
          nextRev = this.setLocalRevision(
            blockId,
            Math.max(Number(nextRev), Number(remoteRes.newBlockRevision))
          );
        }
      }
    } catch {
      // Offline / local simulator
    }

    const created: GovernedQuestion[] = validation.validQuestions.map((q) => ({
      ...q,
      provenanceScope: 'global-canonical',
      editorialStatus: 'published',
      status: 'active',
      stemHash: validation.stemHashes.get(q.id) || QuestionCanonicalHasher.computeStemHashSync(q.stem),
      globalRevision: Number(nextRev),
      authorId: actorId,
      authorDisplayName: actorDisplayName,
      reviewedById: actorId,
      reviewedByDisplayName: actorDisplayName,
      reviewerNotes: 'Directly authored by Faculty/Admin.',
      publishedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const map = new Map<string, GovernedQuestion>();
    canonical.forEach((q) => map.set(q.id, q));
    created.forEach((q) => map.set(q.id, q));
    this.saveLocalCanonicalBank(blockId, Array.from(map.values()));

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
      revisionAfter: Number(nextRev),
      summary: `Created ${created.length} canonical question(s) directly in the Global Bank.`,
      occurredAt: nowIso,
    });

    this.broadcastGlobalBankMutation(blockId, Number(nextRev));

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

    const blockId: BlockId = 'cvs';
    const canonical = this.getLocalCanonicalBank(blockId);
    const idx = canonical.findIndex((q) => q.id === questionId);

    if (idx === -1) {
      return err({ code: 'QUESTION_NOT_FOUND', questionId });
    }

    const existing = canonical[idx];
    let nextRev = this.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();

    try {
      const res = await fetch(`/api/admin/questions/canonical/${encodeURIComponent(questionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const remoteRes = await res.json();
        if (remoteRes.newBlockRevision) {
          nextRev = this.setLocalRevision(
            blockId,
            Math.max(Number(nextRev), Number(remoteRes.newBlockRevision))
          );
        }
      }
    } catch {
      // Offline / local simulator
    }

    const stemHash = patch.stem
      ? QuestionCanonicalHasher.computeStemHashSync(patch.stem)
      : existing.stemHash;

    const updatedQuestion: GovernedQuestion = {
      ...existing,
      ...patch,
      stemHash,
      bankVersion: (existing.bankVersion || 1) + 1,
      globalRevision: Number(nextRev),
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
      revisionAfter: Number(nextRev),
      summary: `Updated canonical question: ${changeReason}`,
      occurredAt: nowIso,
    };

    this.appendLocalAuditLog(blockId, auditEntry);
    this.broadcastGlobalBankMutation(blockId, Number(nextRev));

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

    const blockId: BlockId = 'cvs';
    const canonical = this.getLocalCanonicalBank(blockId);
    const idx = canonical.findIndex((q) => q.id === questionId);

    if (idx === -1) {
      return err({ code: 'QUESTION_NOT_FOUND', questionId });
    }

    const existing = canonical[idx];
    let nextRev = this.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();
    const nextStatus = archive ? 'archived' : 'published';

    try {
      const res = await fetch(`/api/admin/questions/canonical/${encodeURIComponent(questionId)}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const remoteRes = await res.json();
        if (remoteRes.newBlockRevision) {
          nextRev = this.setLocalRevision(
            blockId,
            Math.max(Number(nextRev), Number(remoteRes.newBlockRevision))
          );
        }
      }
    } catch {
      // Offline / local simulator
    }

    const updatedQuestion: GovernedQuestion = {
      ...existing,
      editorialStatus: nextStatus,
      status: archive ? 'quarantined' : 'active',
      globalRevision: Number(nextRev),
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
      revisionAfter: Number(nextRev),
      summary: `${archive ? 'Archived' : 'Restored'} question. Reason: ${reason}`,
      occurredAt: nowIso,
    };

    this.appendLocalAuditLog(blockId, auditEntry);
    this.broadcastGlobalBankMutation(blockId, Number(nextRev));

    return ok({
      updatedQuestion,
      auditEntry,
      newBlockRevision: nextRev,
    });
  }
}

export const edgeQuestionBankGateway = new EdgeQuestionBankGateway();
