import { ok, err, type Result } from '../../../domain/shared/result.ts';
import type {
  BlockId,
  QuestionId,
  Question,
} from '../../../domain/model/types.ts';
import type {
  ICanonicalBankCuratorPort,
  GovernedQuestion,
  EditorialAuditLogEntry,
  GlobalBankGovernanceKpis,
  QuestionMutationPatch,
  BankRevisionNumber,
  QuestionBankDomainError,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { QuestionCanonicalHasher } from '../../../domain/questionBank/canonicalHasher.ts';
import { computeGlobalBankKpis } from '../../../domain/questionBank/questionSpecifications.ts';
import type { QuestionQualityGatePipeline } from '../../../domain/questionBank/qualityGatePipeline.ts';
import {
  STORAGE_KEYS,
  safeGetStorage,
  safeSetStorage,
  type LocalBankStorageSimulator,
} from './LocalBankStorageSimulator.ts';

export class EdgeCanonicalCuratorClient implements ICanonicalBankCuratorPort {
  constructor(
    private simulator: LocalBankStorageSimulator,
    private qualityPipeline: QuestionQualityGatePipeline
  ) {}

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
    const localQuestions = this.simulator.getLocalCanonicalBank(blockId);
    const localLogs = this.simulator.getLocalAuditLogs(blockId);
    const localRev = this.simulator.getLocalRevision(blockId);

    try {
      const res = await fetch(`/api/admin/questions/catalog?block=${encodeURIComponent(blockId)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const remoteData = await res.json();
        const remoteRev = Number(remoteData.kpis?.currentBlockRevision || 1);
        if (Array.isArray(remoteData.questions) && remoteData.questions.length > 0 && remoteRev >= localRev) {
          this.simulator.saveLocalCanonicalBank(blockId, remoteData.questions);
          this.simulator.setLocalRevision(blockId, remoteRev);
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
    readonly actorRole: EditorialAuditLogEntry['actorRole'];
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
    const canonical = this.simulator.getLocalCanonicalBank(blockId);
    let nextRev = this.simulator.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();

    // Try remote worker
    try {
      const res = await fetch('/api/admin/questions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const remoteRes = await res.json();
        if (remoteRes.newBlockRevision) {
          nextRev = this.simulator.setLocalRevision(
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
    this.simulator.saveLocalCanonicalBank(blockId, Array.from(map.values()));

    this.simulator.appendLocalAuditLog(blockId, {
      id: `audit-${Date.now()}` as EditorialAuditLogEntry['id'],
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

    this.simulator.broadcastGlobalBankMutation(blockId, Number(nextRev));

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
    readonly actorRole: EditorialAuditLogEntry['actorRole'];
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
    const { questionId, patch, actorId, actorDisplayName, actorRole, changeReason } = params;

    const blockId: BlockId = params.blockId || 'cvs';
    const canonical = this.simulator.getLocalCanonicalBank(blockId);
    const idx = canonical.findIndex((q) => q.id === questionId);

    if (idx === -1) {
      return err({ code: 'QUESTION_NOT_FOUND', questionId });
    }

    const existing = canonical[idx];
    let nextRev = this.simulator.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();

    try {
      const res = await fetch(`/api/admin/questions/canonical/${encodeURIComponent(questionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const remoteRes = await res.json();
        if (remoteRes.newBlockRevision) {
          nextRev = this.simulator.setLocalRevision(
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
    this.simulator.saveLocalCanonicalBank(blockId, canonical);

    const auditEntry: EditorialAuditLogEntry = {
      id: `audit-${Date.now()}` as EditorialAuditLogEntry['id'],
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

    this.simulator.appendLocalAuditLog(blockId, auditEntry);
    this.simulator.broadcastGlobalBankMutation(blockId, Number(nextRev));

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
    readonly actorRole: EditorialAuditLogEntry['actorRole'];
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
    const { questionId, archive, actorId, actorDisplayName, actorRole, reason } = params;

    const blockId: BlockId = params.blockId || 'cvs';
    const canonical = this.simulator.getLocalCanonicalBank(blockId);
    const idx = canonical.findIndex((q) => q.id === questionId);

    if (idx === -1) {
      return err({ code: 'QUESTION_NOT_FOUND', questionId });
    }

    const existing = canonical[idx];
    let nextRev = this.simulator.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();
    const nextStatus = archive ? 'archived' : 'published';

    try {
      const res = await fetch(`/api/admin/questions/canonical/${encodeURIComponent(questionId)}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const remoteRes = await res.json();
        if (remoteRes.newBlockRevision) {
          nextRev = this.simulator.setLocalRevision(
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
    this.simulator.saveLocalCanonicalBank(blockId, canonical);

    const auditEntry: EditorialAuditLogEntry = {
      id: `audit-${Date.now()}` as EditorialAuditLogEntry['id'],
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

    this.simulator.appendLocalAuditLog(blockId, auditEntry);
    this.simulator.broadcastGlobalBankMutation(blockId, Number(nextRev));

    return ok({
      updatedQuestion,
      auditEntry,
      newBlockRevision: nextRev,
    });
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
    const { questionId, actorId, actorDisplayName, actorRole, reason, permanent = true } = params;

    const blockId: BlockId = params.blockId || 'cvs';
    const canonical = this.simulator.getLocalCanonicalBank(blockId);
    const idx = canonical.findIndex((q) => q.id === questionId);

    if (idx === -1) {
      return err({ code: 'QUESTION_NOT_FOUND', questionId });
    }

    const existing = canonical[idx];
    let nextRev = this.simulator.bumpLocalRevision(blockId);
    const nowIso = new Date().toISOString();

    try {
      const res = await fetch(`/api/admin/questions/canonical/${encodeURIComponent(questionId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, actorDisplayName, actorRole, reason, permanent }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const remoteRes = await res.json();
        if (remoteRes.newBlockRevision) {
          nextRev = this.simulator.setLocalRevision(
            blockId,
            Math.max(Number(nextRev), Number(remoteRes.newBlockRevision))
          );
        }
      }
    } catch {
      // Offline / local simulator
    }

    if (permanent) {
      canonical.splice(idx, 1);
      try {
        const deletedKey = `${STORAGE_KEYS.DELETED_QUESTIONS}_${blockId}`;
        const deletedIds = (JSON.parse(safeGetStorage(deletedKey) || '[]') as string[]);
        if (!deletedIds.includes(questionId)) {
          deletedIds.push(questionId);
          safeSetStorage(deletedKey, JSON.stringify(deletedIds));
        }
      } catch {
        // Ignore
      }
    } else {
      canonical[idx] = {
        ...existing,
        editorialStatus: 'archived',
        status: 'quarantined',
        globalRevision: Number(nextRev),
        updatedAt: nowIso,
      };
    }

    this.simulator.saveLocalCanonicalBank(blockId, canonical);

    const auditEntry: EditorialAuditLogEntry = {
      id: `audit-${Date.now()}` as EditorialAuditLogEntry['id'],
      questionId,
      blockId,
      action: permanent
        ? ('CANONICAL_QUESTION_DELETED' as unknown as EditorialAuditLogEntry['action'])
        : 'CANONICAL_QUESTION_ARCHIVED',
      actorUserId: actorId,
      actorDisplayName,
      actorRole,
      previousStatus: existing.editorialStatus,
      nextStatus: permanent
        ? ('deleted' as unknown as EditorialAuditLogEntry['nextStatus'])
        : 'archived',
      revisionAfter: Number(nextRev),
      summary: `${permanent ? 'Permanently deleted' : 'Archived'} canonical question: ${reason}`,
      occurredAt: nowIso,
    };

    this.simulator.appendLocalAuditLog(blockId, auditEntry);
    this.simulator.broadcastGlobalBankMutation(blockId, Number(nextRev));

    return ok({
      deletedQuestionId: questionId,
      auditEntry,
      newBlockRevision: nextRev,
    });
  }
}
