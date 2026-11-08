/**
 * Infrastructure Gateway: Edge Question Bank & Governance Gateway
 * Layer: Infrastructure (Hexagonal Gateway Facade)
 *
 * Coordinates downstream sync, proposal submission, review queue, and canonical curation
 * across Cloudflare Worker edge routes and deterministic local storage simulation.
 */

import type { Result } from '../../domain/shared/result.ts';
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
  QuestionMutationPatch,
  UserId,
  UserRole,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionQualityGatePipeline } from '../../domain/questionBank/qualityGatePipeline.ts';
import {
  LocalBankStorageSimulator,
  STORAGE_KEYS,
  safeGetStorage,
  safeSetStorage,
} from './clients/LocalBankStorageSimulator.ts';
import { EdgeQuestionSyncClient } from './clients/EdgeQuestionSyncClient.ts';
import { EdgeProposalSubmissionClient } from './clients/EdgeProposalSubmissionClient.ts';
import { EdgeFacultyReviewQueueClient } from './clients/EdgeFacultyReviewQueueClient.ts';
import { EdgeCanonicalCuratorClient } from './clients/EdgeCanonicalCuratorClient.ts';

export {
  LocalBankStorageSimulator,
  EdgeQuestionSyncClient,
  EdgeProposalSubmissionClient,
  EdgeFacultyReviewQueueClient,
  EdgeCanonicalCuratorClient,
  STORAGE_KEYS,
  safeGetStorage,
  safeSetStorage,
};

export class EdgeQuestionBankGateway
  implements
    IDownstreamBankSyncPort,
    IStudioProposalSubmissionPort,
    IFacultyReviewQueuePort,
    ICanonicalBankCuratorPort
{
  private readonly qualityPipeline = new QuestionQualityGatePipeline();
  private readonly simulator: LocalBankStorageSimulator;
  private readonly syncClient: EdgeQuestionSyncClient;
  private readonly proposalClient: EdgeProposalSubmissionClient;
  private readonly reviewQueueClient: EdgeFacultyReviewQueueClient;
  private readonly curatorClient: EdgeCanonicalCuratorClient;

  constructor(simulator?: LocalBankStorageSimulator) {
    this.simulator = simulator ?? new LocalBankStorageSimulator();
    this.syncClient = new EdgeQuestionSyncClient(this.simulator);
    this.proposalClient = new EdgeProposalSubmissionClient(
      this.simulator,
      this.qualityPipeline
    );
    this.reviewQueueClient = new EdgeFacultyReviewQueueClient(this.simulator);
    this.curatorClient = new EdgeCanonicalCuratorClient(
      this.simulator,
      this.qualityPipeline
    );
  }

  // =========================================================================
  // SIMULATOR ACCESSORS (Backwards compatibility & deterministic testability)
  // =========================================================================
  public getLocalCanonicalBank(blockId: BlockId = 'cvs'): GovernedQuestion[] {
    return this.simulator.getLocalCanonicalBank(blockId);
  }

  public saveLocalCanonicalBank(
    blockId: BlockId,
    questions: readonly GovernedQuestion[]
  ): void {
    this.simulator.saveLocalCanonicalBank(blockId, questions);
  }

  public getLocalRevision(blockId: BlockId = 'cvs'): BankRevisionNumber {
    return this.simulator.getLocalRevision(blockId);
  }

  public ensureMinimumLocalRevision(
    blockId: BlockId = 'cvs',
    minRev: number
  ): BankRevisionNumber {
    return this.simulator.ensureMinimumLocalRevision(blockId, minRev);
  }

  public broadcastGlobalBankMutation(
    blockId: BlockId,
    newRevision: number
  ): void {
    this.simulator.broadcastGlobalBankMutation(blockId, newRevision);
  }

  // =========================================================================
  // PORT 1: IDownstreamBankSyncPort (Student & All Users Read-Only Sync)
  // =========================================================================
  public async fetchDeltaSync(
    blockId: BlockId,
    cursor: BankSyncCursor | null,
    signal?: AbortSignal
  ): Promise<Result<BankDeltaSyncResponse, QuestionBankDomainError>> {
    return this.syncClient.fetchDeltaSync(blockId, cursor, signal);
  }

  public async probeRemoteRevision(blockId: string): Promise<{
    readonly revision: number;
    readonly etag: string;
    readonly canonicalCount: number;
    readonly source: 'edge' | 'local';
  }> {
    return this.syncClient.checkBankRevision(blockId as BlockId);
  }

  public async checkBankRevision(
    blockId: BlockId,
    timeoutMs?: number
  ): Promise<{
    readonly revision: number;
    readonly etag: string;
    readonly canonicalCount: number;
    readonly source: 'edge' | 'local';
  }> {
    return this.syncClient.checkBankRevision(blockId, timeoutMs);
  }

  // =========================================================================
  // PORT 2: IStudioProposalSubmissionPort (Authoring & Review Staging)
  // =========================================================================
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
    return this.proposalClient.submitQuestionsForGlobalReview(params);
  }

  public async listMySubmissions(
    authorId: string
  ): Promise<
    Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>
  > {
    return this.proposalClient.listMySubmissions(authorId);
  }

  // =========================================================================
  // PORT 3: IFacultyReviewQueuePort (Peer Review & Triage)
  // =========================================================================
  public async listReviewQueue(
    blockId: BlockId = 'cvs'
  ): Promise<
    Result<readonly QuestionReviewSubmission[], QuestionBankDomainError>
  > {
    return this.reviewQueueClient.listReviewQueue(blockId);
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
    return this.reviewQueueClient.submitReviewDecision(command);
  }

  // =========================================================================
  // PORT 4: ICanonicalBankCuratorPort (Canonical CRUD & Retraction)
  // =========================================================================
  public async listGlobalBankCatalog(
    blockId: BlockId = 'cvs'
  ): Promise<
    Result<
      {
        readonly questions: readonly GovernedQuestion[];
        readonly auditLogs: readonly EditorialAuditLogEntry[];
        readonly kpis: GlobalBankGovernanceKpis;
      },
      QuestionBankDomainError
    >
  > {
    return this.curatorClient.listGlobalBankCatalog(blockId);
  }

  public async createCanonicalQuestions(params: {
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
  > {
    return this.curatorClient.createCanonicalQuestions(params);
  }

  public async updateCanonicalQuestion(params: {
    readonly questionId: QuestionId;
    readonly patch: QuestionMutationPatch;
    readonly actorId: UserId;
    readonly actorDisplayName: string;
    readonly actorRole: UserRole;
    readonly changeReason: string;
    readonly blockId?: BlockId;
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
    return this.curatorClient.updateCanonicalQuestion(params);
  }

  public async setCanonicalArchiveStatus(params: {
    readonly questionId: QuestionId;
    readonly archive: boolean;
    readonly actorId: UserId;
    readonly actorDisplayName: string;
    readonly actorRole: UserRole;
    readonly reason: string;
    readonly blockId?: BlockId;
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
    return this.curatorClient.setCanonicalArchiveStatus(params);
  }

  public async deleteCanonicalQuestion(params: {
    readonly questionId: QuestionId;
    readonly actorId: string;
    readonly actorDisplayName: string;
    readonly actorRole: EditorialAuditLogEntry['actorRole'];
    readonly reason: string;
    readonly permanent?: boolean;
    readonly blockId?: BlockId;
  }): Promise<
    Result<
      {
        readonly deletedQuestionId: QuestionId;
        readonly auditEntry: EditorialAuditLogEntry;
        readonly newBlockRevision: BankRevisionNumber;
      },
      QuestionBankDomainError
    >
  > {
    return this.curatorClient.deleteCanonicalQuestion(params);
  }
}

export const edgeQuestionBankGateway = new EdgeQuestionBankGateway();
