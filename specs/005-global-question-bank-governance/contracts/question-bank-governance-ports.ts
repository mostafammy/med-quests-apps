/**
 * Clean Architecture Domain Ports, OOP Contracts, Value Objects & Branded Data Types
 * Feature: 005-global-question-bank-governance
 * Target Stack: TypeScript 5.7 (strict: true), React 19, Zustand 5, Dexie 4, Cloudflare Workers + KV + D1
 */

import type { Result } from '../../../src/domain/shared/result.ts';
import type {
  BlockId,
  SubjectId,
  ChapterId,
  TopicId,
  QuestionId,
  Question,
  Choice,
  Evidence,
  IsoDateTime,
} from '../../../src/domain/model/types.ts';
import type { UserId, UserRole } from '../../../src/domain/auth/types.ts';

// ==========================================
// 1. BRANDED NOMINAL PRIMITIVES & VALUE TYPES
// ==========================================
declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Monotonically increasing revision number per curriculum block (e.g., 1, 2, 3...) */
export type BankRevisionNumber = Brand<number, 'BankRevisionNumber'>;

/** Lowercase hex-encoded SHA-256 fingerprint of normalized stem text for O(1) deduplication */
export type StemSha256Hash = Brand<string, 'StemSha256Hash'>;

/** Unique identifier for an editorial review submission ticket */
export type SubmissionTicketId = Brand<string, 'SubmissionTicketId'>;

/** Unique identifier for an immutable editorial audit log entry */
export type EditorialAuditEventId = Brand<string, 'EditorialAuditEventId'>;

// ==========================================
// 2. EXHAUSTIVE DISCRIMINATED UNIONS & ENUMS
// ==========================================

/**
 * Tracks the lifecycle state of a question across the local sandbox and global bank.
 */
export type QuestionEditorialStatus =
  | 'local_draft'        // Exists only in the author's local IndexedDB
  | 'pending_review'     // Submitted to the Global Review Queue awaiting Faculty triage
  | 'changes_requested'  // Returned to author with specific faculty revision notes
  | 'rejected'           // Rejected by faculty reviewer (remains local-only if desired)
  | 'published'          // Canonical, faculty-verified question distributed to all scholars
  | 'archived';          // Soft-retired tombstone (excluded from new tests; preserves Attempt history)

/**
 * Tracks the provenance of a question inside a learner's local IndexedDB.
 * Crucial for non-destructive downstream sync merges.
 */
export type QuestionProvenanceScope =
  | 'seed-bundled'       // Shipped in the static initial curriculum bundle (bank.v1.json)
  | 'local-custom'       // Authored locally by the student/faculty in Studio (protected from sync overwrite)
  | 'submitted-pending'  // Authored locally and submitted to the global review queue
  | 'global-canonical';  // Synchronized downstream from the verified Global Question Bank

/**
 * Editorial decision actions available to `faculty-reviewer` and `admin` roles.
 */
export type EditorialReviewDecisionType =
  | 'approve_and_publish'
  | 'request_changes'
  | 'reject_submission';

/**
 * Audit action types recorded in the immutable editorial log.
 */
export type EditorialAuditAction =
  | 'SUBMISSION_CREATED'
  | 'SUBMISSION_APPROVED'
  | 'SUBMISSION_CHANGES_REQUESTED'
  | 'SUBMISSION_REJECTED'
  | 'CANONICAL_QUESTION_CREATED'
  | 'CANONICAL_QUESTION_UPDATED'
  | 'CANONICAL_QUESTION_ARCHIVED'
  | 'CANONICAL_QUESTION_RESTORED';

// ==========================================
// 3. DOMAIN ERROR DISCRIMINATED UNION
// ==========================================
export type QuestionBankDomainError =
  | {
      readonly code: 'SCHEMA_VALIDATION_FAILED';
      readonly itemIndex: number;
      readonly fieldPath: string;
      readonly message: string;
    }
  | {
      readonly code: 'DUPLICATE_STEM_CONFLICT';
      readonly existingQuestionId: QuestionId;
      readonly stemHash: StemSha256Hash;
      readonly chapterId: ChapterId;
      readonly message: string;
    }
  | {
      readonly code: 'INVALID_EDITORIAL_STATE_TRANSITION';
      readonly questionId: QuestionId;
      readonly fromStatus: QuestionEditorialStatus;
      readonly attemptedDecision: EditorialReviewDecisionType;
      readonly message: string;
    }
  | {
      readonly code: 'INSUFFICIENT_EDITORIAL_PERMISSION';
      readonly requiredRoles: readonly UserRole[];
      readonly actualRole: UserRole;
      readonly operation: string;
    }
  | {
      readonly code: 'QUESTION_NOT_FOUND';
      readonly questionId: QuestionId;
    }
  | {
      readonly code: 'INSUFFICIENT_EVIDENCE_GROUNDING';
      readonly questionId: QuestionId;
      readonly reason: string;
    }
  | {
      readonly code: 'SYNC_NETWORK_UNAVAILABLE';
      readonly cachedRevision: number;
      readonly message: string;
    };

// ==========================================
// 4. CORE VALUE OBJECTS & ENTITIES
// ==========================================

/**
 * Extended Question Aggregate Root carrying provenance, editorial metadata,
 * cryptographic stem hash, and revision version.
 */
export interface GovernedQuestion extends Question {
  readonly provenanceScope: QuestionProvenanceScope;
  readonly editorialStatus: QuestionEditorialStatus;
  readonly stemHash: StemSha256Hash;
  readonly globalRevision: number;
  readonly authorId: UserId;
  readonly authorDisplayName: string;
  readonly reviewedById: UserId | null;
  readonly reviewedByDisplayName: string | null;
  readonly reviewerNotes: string | null;
  readonly publishedAt: IsoDateTime | null;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

/**
 * Watermark cursor persisted in client IndexedDB (`bankSyncMeta`) per block.
 */
export interface BankSyncCursor {
  readonly blockId: BlockId;
  readonly serverRevision: BankRevisionNumber;
  readonly lastSyncedAt: IsoDateTime;
  readonly etag: string;
  readonly totalCanonicalCount: number;
}

/**
 * Payload returned by `GET /api/bank/sync` during incremental delta synchronization.
 */
export interface BankDeltaSyncResponse {
  readonly status: 'up-to-date' | 'delta-applied';
  readonly blockId: BlockId;
  readonly revision: BankRevisionNumber;
  readonly syncedAt: IsoDateTime;
  readonly etag: string;
  readonly upsertedQuestions: readonly GovernedQuestion[];
  readonly archivedQuestionIds: readonly QuestionId[];
}

/**
 * Summary report of merging a global delta payload into the client's local IndexedDB.
 */
export interface LocalBankMergeReport {
  readonly blockId: BlockId;
  readonly previousRevision: number;
  readonly newRevision: number;
  readonly insertedCount: number;
  readonly updatedCanonicalCount: number;
  readonly archivedTombstoneCount: number;
  readonly preservedLocalCustomCount: number;
  readonly syncedAt: IsoDateTime;
}

/**
 * Represents a question submission ticket in the Faculty Review Queue.
 */
export interface QuestionReviewSubmission {
  readonly ticketId: SubmissionTicketId;
  readonly question: GovernedQuestion;
  readonly submittedByUserId: UserId;
  readonly submittedByDisplayName: string;
  readonly submittedByRole: UserRole;
  readonly submittedAt: IsoDateTime;
  readonly editorialStatus: Extract<
    QuestionEditorialStatus,
    'pending_review' | 'changes_requested' | 'rejected' | 'published'
  >;
  readonly reviewedByUserId: UserId | null;
  readonly reviewedByDisplayName: string | null;
  readonly reviewedAt: IsoDateTime | null;
  readonly reviewerNotes: string | null;
}

/**
 * Command payload for a Faculty Reviewer or Admin making a triage decision.
 */
export interface EditorialDecisionCommand {
  readonly ticketId: SubmissionTicketId;
  readonly questionId: QuestionId;
  readonly reviewerUserId: UserId;
  readonly reviewerDisplayName: string;
  readonly reviewerRole: UserRole;
  readonly decision: EditorialReviewDecisionType;
  readonly reviewerNotes: string;
  /** Optional inline edits made by the faculty reviewer prior to publishing */
  readonly inlinePatch?: QuestionMutationPatch;
}

/**
 * Typed mutation patch for editing an existing question or inline-refining a submission.
 */
export interface QuestionMutationPatch {
  readonly subjectId?: SubjectId;
  readonly chapterId?: ChapterId;
  readonly topicId?: TopicId;
  readonly concept?: string;
  readonly stem?: string;
  readonly choices?: readonly [Choice, Choice, Choice, Choice];
  readonly explanation?: string;
  readonly examTip?: string | null;
  readonly mnemonic?: string | null;
  readonly difficulty?: 1 | 2 | 3;
  readonly cognitiveLevel?: 'recall' | 'understanding' | 'application';
  readonly highYield?: boolean;
  readonly evidence?: readonly Evidence[];
}

/**
 * Immutable audit record for every editorial or administrative question mutation.
 */
export interface EditorialAuditLogEntry {
  readonly id: EditorialAuditEventId;
  readonly questionId: QuestionId;
  readonly blockId: BlockId;
  readonly action: EditorialAuditAction;
  readonly actorUserId: UserId;
  readonly actorDisplayName: string;
  readonly actorRole: UserRole;
  readonly previousStatus: QuestionEditorialStatus | null;
  readonly nextStatus: QuestionEditorialStatus;
  readonly revisionAfter: number;
  readonly summary: string;
  readonly occurredAt: IsoDateTime;
}

/**
 * Real-time KPI summary for the Admin & Reviewer Question Bank Governance Cockpit.
 */
export interface GlobalBankGovernanceKpis {
  readonly totalPublishedCanonical: number;
  readonly totalPendingReview: number;
  readonly totalChangesRequested: number;
  readonly totalRejected: number;
  readonly totalArchivedTombstones: number;
  readonly currentBlockRevision: number;
  readonly highYieldPercentage: number;
  readonly subjectBreakdown: Readonly<Record<SubjectId, number>>;
  readonly difficultyBreakdown: {
    readonly foundational: number;
    readonly intermediate: number;
    readonly advanced: number;
  };
}

// ==========================================
// 5. OOP SPECIFICATION PATTERN (QUERY & FILTERING)
// ==========================================

/**
 * Generic OOP Specification interface supporting boolean composition (AND / OR / NOT).
 */
export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: ISpecification<T>): ISpecification<T>;
  or(other: ISpecification<T>): ISpecification<T>;
  not(): ISpecification<T>;
}

/**
 * Filter criteria DTO used by the Global Bank Curator and Review Queue UI.
 */
export interface QuestionCuratorFilterCriteria {
  readonly blockId?: BlockId | 'all';
  readonly subjectId?: SubjectId | 'all';
  readonly chapterId?: ChapterId | 'all';
  readonly topicId?: TopicId | 'all';
  readonly editorialStatus?: QuestionEditorialStatus | 'all';
  readonly provenanceScope?: QuestionProvenanceScope | 'all';
  readonly difficulty?: 1 | 2 | 3 | 'all';
  readonly highYieldOnly?: boolean;
  readonly searchQuery?: string;
}

// ==========================================
// 6. OOP STRATEGY PATTERN: QUALITY GATING & MERGE RULES
// ==========================================

/**
 * Open/Closed Principle (OCP): Pluggable validation rule for clinical question ingestion.
 */
export interface IQuestionQualityRule {
  readonly ruleId: string;
  readonly description: string;
  validate(question: Question, index: number): Result<void, QuestionBankDomainError>;
}

/**
 * Strategy interface for resolving conflicts when merging downstream global updates
 * into a learner's local IndexedDB store.
 */
export interface IQuestionMergeStrategy {
  mergeGlobalDeltaIntoLocal(params: {
    readonly blockId: BlockId;
    readonly currentLocalQuestions: readonly GovernedQuestion[];
    readonly incomingGlobalQuestions: readonly GovernedQuestion[];
    readonly archivedGlobalIds: readonly QuestionId[];
    readonly newRevision: BankRevisionNumber;
    readonly syncedAt: IsoDateTime;
  }): {
    readonly mergedQuestions: readonly GovernedQuestion[];
    readonly report: LocalBankMergeReport;
  };
}

// ==========================================
// 7. HEXAGONAL PORTS (ISP SEGREGATED INTERFACES)
// ==========================================

/**
 * Port 1: Read-Only Downstream Global Synchronization (Used by all Students, Faculty, Admins).
 * Physically incapable of mutating the global bank.
 */
export interface IDownstreamBankSyncPort {
  /**
   * Pulls only published canonical questions changed since `cursor.lastSyncedAt`.
   * Sends `If-None-Match` ETag for 0-byte `304 Not Modified` fast-path.
   */
  fetchDeltaSync(
    blockId: BlockId,
    cursor: BankSyncCursor | null,
    signal?: AbortSignal
  ): Promise<Result<BankDeltaSyncResponse, QuestionBankDomainError>>;
}

/**
 * Port 2: Question Studio Proposal Submission (Used by Authors / Students / Faculty).
 * Stages validated questions into the Global Review Queue without altering published items.
 */
export interface IStudioProposalSubmissionPort {
  /**
   * Submits one or more locally authored questions to the Global Review Queue (`pending_review`).
   */
  submitQuestionsForGlobalReview(params: {
    readonly questions: readonly Question[];
    readonly authorId: UserId;
    readonly authorDisplayName: string;
    readonly authorRole: UserRole;
  }): Promise<
    Result<
      {
        readonly submittedTickets: readonly QuestionReviewSubmission[];
        readonly duplicateQuestionIds: readonly QuestionId[];
      },
      QuestionBankDomainError
    >
  >;

  /**
   * Lists the current user's own submitted questions and their live review status/feedback.
   */
  listMySubmissions(authorId: UserId): Promise<Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>>;
}

/**
 * Port 3: Faculty Review Queue Port (Restricted to `faculty-reviewer` and `admin`).
 */
export interface IFacultyReviewQueuePort {
  /**
   * Fetches all submissions filtered by status (`pending_review`, `changes_requested`, `rejected`, `published`).
   */
  listReviewQueue(
    blockId?: BlockId
  ): Promise<Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>>;

  /**
   * Executes an atomic review decision (`approve_and_publish`, `request_changes`, or `reject_submission`).
   * If `approve_and_publish`, promotes the question to `global-canonical`, increments `bank_revisions`,
   * and appends an `EditorialAuditLogEntry`.
   */
  submitReviewDecision(
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
  >;
}

/**
 * Port 4: Canonical Global Bank Curator Port (Restricted to `admin` and `faculty-reviewer`).
 * Provides direct CRUD, versioned errata updates, and soft-retirement tombstones.
 */
export interface ICanonicalBankCuratorPort {
  /**
   * Lists all questions in the global bank (including `published` and `archived`) for curation.
   */
  listGlobalBankCatalog(
    blockId?: BlockId
  ): Promise<
    Result<
      {
        readonly questions: readonly GovernedQuestion[];
        readonly auditLogs: readonly EditorialAuditLogEntry[];
        readonly kpis: GlobalBankGovernanceKpis;
      },
      QuestionBankDomainError
    >
  >;

  /**
   * Directly creates and publishes a new canonical question (or batch) into the global bank.
   */
  createCanonicalQuestions(params: {
    readonly questions: readonly Question[];
    readonly actorId: UserId;
    readonly actorDisplayName: string;
    readonly actorRole: UserRole;
  }): Promise<
    Result<
      {
        readonly created: readonly GovernedQuestion[];
        readonly newBlockRevision: BankRevisionNumber;
      },
      QuestionBankDomainError
    >
  >;

  /**
   * Updates an existing canonical question in-place, increments its `bankVersion` and
   * the block's `BankRevisionNumber`, and records an audit trail entry.
   */
  updateCanonicalQuestion(params: {
    readonly questionId: QuestionId;
    readonly patch: QuestionMutationPatch;
    readonly actorId: UserId;
    readonly actorDisplayName: string;
    readonly actorRole: UserRole;
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
  >;

  /**
   * Soft-retires (`archived`) or restores (`published`) a canonical question.
   * Never hard-deletes rows so historical learner `Attempt` records remain valid.
   */
  setCanonicalArchiveStatus(params: {
    readonly questionId: QuestionId;
    readonly archive: boolean;
    readonly actorId: UserId;
    readonly actorDisplayName: string;
    readonly actorRole: UserRole;
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
  >;
}
