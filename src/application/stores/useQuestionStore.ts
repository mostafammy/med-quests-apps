import { create } from 'zustand';
import { Question, QuestionSchema } from '../../domain/model/types.ts';
import { db } from '../../infrastructure/storage/db.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { NonDestructiveBankMergeStrategy } from '../../domain/questionBank/nonDestructiveMergeStrategy.ts';
import { BankResetPlanner } from '../../domain/questionBank/bankResetPlanner.ts';
import { QuestionCanonicalHasher } from '../../domain/questionBank/canonicalHasher.ts';
import { useAuthStore } from './useAuthStore.ts';
import { edgeAuthGateway } from '../../infrastructure/auth/edgeAuthGateway.ts';
import type {
  BankSyncCursor,
  LocalBankMergeReport,
  GovernedQuestion,
  QuestionReviewSubmission,
  BankRevisionNumber,
  BankVersionDiffPreview,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

const mergeStrategy = new NonDestructiveBankMergeStrategy();
const resetPlanner = new BankResetPlanner(mergeStrategy);

export type SyncTelemetryPhase =
  | 'idle'
  | 'probing-edge'
  | 'computing-diff'
  | 'changes-detected'
  | 'applying-merge'
  | 'up-to-date'
  | 'local-retained'
  | 'resetting-bank'
  | 'error';

interface QuestionStoreState {
  questions: Question[];
  activeBlockId: string;
  isLoading: boolean;
  isSyncing: boolean;
  syncPhase: SyncTelemetryPhase;
  syncCursor: BankSyncCursor | null;
  pendingDiffPreview: BankVersionDiffPreview | null;
  dismissedRemoteRevision: number | null;
  lastMergeReport: LocalBankMergeReport | null;
  mySubmissions: QuestionReviewSubmission[];
  error: string | null;

  // Actions
  loadQuestions: (blockId?: string) => Promise<void>;
  checkForGlobalUpdates: (
    blockId?: string,
    options?: { force?: boolean }
  ) => Promise<BankVersionDiffPreview | null>;
  applyPendingGlobalMerge: (blockId?: string) => Promise<LocalBankMergeReport | null>;
  dismissPendingGlobalMerge: () => void;
  syncWithGlobalBank: (
    blockId?: string,
    options?: { interactive?: boolean }
  ) => Promise<LocalBankMergeReport | null>;
  ingestQuestions: (rawJson: string | unknown[]) => Promise<{
    count: number;
    errors: string[];
    ingested?: Question[];
  }>;
  submitQuestionsForGlobalReview: (
    rawJson: string | unknown[],
    authorContext?: { authorId?: string; authorDisplayName?: string; authorRole?: any }
  ) => Promise<{ count: number; errors: string[]; ticketCount: number }>;
  loadMySubmissions: (authorId?: string) => Promise<void>;
  exportBankJson: (blockId?: string) => string;
  clearBank: (blockId?: string) => Promise<void>;
  resetLocalBankToGlobal: (blockId?: string) => Promise<{
    resetCount: number;
    revision: number;
    report: LocalBankMergeReport;
  }>;
}

function filterActiveQuestions(list: readonly (Question | GovernedQuestion)[]): Question[] {
  return list.filter(
    (q) =>
      q.status !== 'quarantined' &&
      (q as GovernedQuestion).editorialStatus !== 'archived'
  ) as Question[];
}

function enrichBundledQuestions(rawList: readonly Question[]): GovernedQuestion[] {
  const nowIso = new Date().toISOString();
  return rawList.map((q) => ({
    ...q,
    provenanceScope: (q as GovernedQuestion).provenanceScope || 'seed-bundled',
    editorialStatus: (q as GovernedQuestion).editorialStatus || 'published',
    stemHash:
      (q as GovernedQuestion).stemHash ||
      QuestionCanonicalHasher.computeStemHashSync(q.stem),
    globalRevision: (q as GovernedQuestion).globalRevision || 1,
    authorId: (q as GovernedQuestion).authorId || 'usr-curriculum-faculty',
    authorDisplayName:
      (q as GovernedQuestion).authorDisplayName || 'Curriculum Faculty Committee',
    reviewedById: (q as GovernedQuestion).reviewedById || 'usr-admin-initial',
    reviewedByDisplayName:
      (q as GovernedQuestion).reviewedByDisplayName || 'Board Administrator',
    reviewerNotes:
      (q as GovernedQuestion).reviewerNotes || 'Official faculty syllabus verified item.',
    publishedAt: (q as GovernedQuestion).publishedAt || nowIso,
    createdAt: (q as GovernedQuestion).createdAt || nowIso,
    updatedAt: (q as GovernedQuestion).updatedAt || nowIso,
  }));
}

export const useQuestionStore = create<QuestionStoreState>((set, get) => ({
  questions: Array.isArray(defaultCvsBank) ? (defaultCvsBank as Question[]) : [],
  activeBlockId: 'cvs',
  isLoading: false,
  isSyncing: false,
  syncPhase: 'idle',
  syncCursor: null,
  pendingDiffPreview: null,
  dismissedRemoteRevision: null,
  lastMergeReport: null,
  mySubmissions: [],
  error: null,

  loadQuestions: async (blockId = 'cvs') => {
    set({ isLoading: true, error: null });
    try {
      // 1. Instant 0ms Local Hydration from IndexedDB
      let stored = await db.questions.where('blockId').equals(blockId).toArray();
      if (stored.length === 0 && blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
        const enrichedSeed = enrichBundledQuestions(defaultCvsBank as Question[]);
        await db.questions.bulkPut(enrichedSeed as unknown as Question[]);
        stored = enrichedSeed as unknown as Question[];
      } else if (stored.length > 0 && blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
        // Non-destructive upgrade: Reconcile unedited seed-bundled questions to bankVersion 2
        const bundledMap = new Map((defaultCvsBank as Question[]).map((q) => [q.id, q]));
        const toUpgrade: Question[] = [];
        for (const q of stored) {
          const governed = q as GovernedQuestion;
          if (governed.provenanceScope === 'seed-bundled' && (governed.bankVersion || 1) < 2) {
            const bundled = bundledMap.get(q.id);
            if (bundled && (bundled.bankVersion || 1) >= 2) {
              toUpgrade.push({
                ...q,
                choices: bundled.choices,
                bankVersion: bundled.bankVersion || 2,
              });
            }
          }
        }
        if (toUpgrade.length > 0) {
          await db.questions.bulkPut(toUpgrade);
          stored = await db.questions.where('blockId').equals(blockId).toArray();
        }
      }

      // 2. Read local sync cursor (or initialize Rev #1 if missing)
      const cursorRecord = await db.bankSyncMeta.get(blockId);
      const activeStored = filterActiveQuestions(stored);
      const cursor: BankSyncCursor = cursorRecord
        ? {
            blockId,
            serverRevision: cursorRecord.serverRevision as BankRevisionNumber,
            lastSyncedAt: cursorRecord.lastSyncedAt,
            etag: cursorRecord.etag,
            totalCanonicalCount: cursorRecord.totalCanonicalCount,
          }
        : {
            blockId,
            serverRevision: 1 as BankRevisionNumber,
            lastSyncedAt: new Date().toISOString(),
            etag: 'W/rev-1',
            totalCanonicalCount: activeStored.length,
          };

      if (!cursorRecord) {
        await db.bankSyncMeta.put({
          blockId,
          serverRevision: 1,
          lastSyncedAt: cursor.lastSyncedAt,
          etag: cursor.etag,
          totalCanonicalCount: activeStored.length,
        });
      }

      set({
        questions: activeStored,
        activeBlockId: blockId,
        syncCursor: cursor,
        isLoading: false,
      });

      // 3. Background non-blocking check for global updates (populates pendingDiffPreview if changes exist)
      get().checkForGlobalUpdates(blockId);
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false, syncPhase: 'error' });
    }
  },

  checkForGlobalUpdates: async (blockId = 'cvs', options: { force?: boolean } = {}) => {
    set({ isSyncing: true, syncPhase: 'probing-edge', error: null });
    try {
      const storedCursor = await db.bankSyncMeta.get(blockId);
      const cursor: BankSyncCursor | null = storedCursor
        ? {
            blockId,
            serverRevision: storedCursor.serverRevision as BankRevisionNumber,
            lastSyncedAt: storedCursor.lastSyncedAt,
            etag: storedCursor.etag,
            totalCanonicalCount: storedCursor.totalCanonicalCount,
          }
        : get().syncCursor;

      const localRev = cursor ? Number(cursor.serverRevision) : 1;

      // Fast path: a cheap edge probe avoids downloading the full canonical bank every
      // 60 seconds. A full snapshot is still fetched whenever the revision/count differs
      // or the user explicitly asks for a review (force: true).
      if (!options.force && storedCursor) {
        const probe = await edgeQuestionBankGateway.probeRemoteRevision(blockId);
        const countMatches = probe.canonicalCount === Number(storedCursor.totalCanonicalCount);
        if (probe.source === 'edge' && probe.revision <= localRev && countMatches) {
          const currentQuestions = (await db.questions
            .where('blockId')
            .equals(blockId)
            .toArray()) as GovernedQuestion[];
          const activeQuestions = filterActiveQuestions(currentQuestions);
          const retained =
            get().dismissedRemoteRevision !== null &&
            Number(get().dismissedRemoteRevision) === Number(probe.revision);
          const nowIso = new Date().toISOString();
          const alignedCursor: BankSyncCursor = {
            blockId,
            serverRevision: Math.max(localRev, probe.revision) as BankRevisionNumber,
            lastSyncedAt: nowIso,
            etag: probe.etag,
            totalCanonicalCount: probe.canonicalCount,
          };
          await db.bankSyncMeta.put({
            blockId,
            serverRevision: Number(alignedCursor.serverRevision),
            lastSyncedAt: nowIso,
            etag: alignedCursor.etag,
            totalCanonicalCount: alignedCursor.totalCanonicalCount,
          });
          const cleanPreview: BankVersionDiffPreview = {
            blockId,
            localRevision: Number(alignedCursor.serverRevision),
            remoteRevision: Number(alignedCursor.serverRevision),
            remoteEtag: alignedCursor.etag,
            localTotalCount: activeQuestions.length,
            remoteCanonicalCount: probe.canonicalCount,
            isOutOfDate: false,
            hasChanges: false,
            addedQuestions: [],
            editedQuestions: [],
            deletedQuestions: [],
            preservedCustomQuestions: [],
            rawDelta: {
              status: 'up-to-date',
              blockId,
              revision: alignedCursor.serverRevision,
              syncedAt: nowIso,
              etag: alignedCursor.etag,
              upsertedQuestions: [],
              archivedQuestionIds: [],
            },
            checkedAt: nowIso,
          };
          set({
            syncCursor: alignedCursor,
            pendingDiffPreview: cleanPreview,
            isSyncing: false,
            syncPhase: retained ? 'local-retained' : 'up-to-date',
          });
          return cleanPreview;
        }
      }

      // Always fetch full canonical state from revision 0 when computing diff so we can accurately detect
      // any missing seed questions, edited explanations/stems, or soft-retired tombstones!
      const syncResult = await edgeQuestionBankGateway.fetchDeltaSync(blockId, {
        blockId,
        serverRevision: 0 as BankRevisionNumber,
        lastSyncedAt: '',
        etag: '',
        totalCanonicalCount: 0,
      });

      if (!syncResult.ok) {
        set({ isSyncing: false, syncPhase: 'idle' });
        return null;
      }

      set({ syncPhase: 'computing-diff' });
      const delta = syncResult.value;
      const currentQuestions = (await db.questions
        .where('blockId')
        .equals(blockId)
        .toArray()) as GovernedQuestion[];

      let diffPreview = mergeStrategy.computeDiffPreview({
        blockId,
        localRevision: localRev,
        currentLocalQuestions: currentQuestions,
        delta,
        remoteCanonicalCount: delta.upsertedQuestions.length,
      });

      // Ensure gateway local revision never lags behind effective remote revision when content diverged
      if (diffPreview.remoteRevision > Number(delta.revision)) {
        edgeQuestionBankGateway.ensureMinimumLocalRevision(blockId, diffPreview.remoteRevision);
      }

      // If there are ZERO canonical content changes (+0 Added, ~0 Edited, -0 Deleted),
      // fast-forward the local revision cursor so Local and Global versions match 100%
      if (!diffPreview.hasChanges && diffPreview.localRevision !== diffPreview.remoteRevision) {
        const syncedRev = Math.max(diffPreview.localRevision, diffPreview.remoteRevision);
        edgeQuestionBankGateway.ensureMinimumLocalRevision(blockId, syncedRev);
        const alignedCursor: BankSyncCursor = {
          blockId,
          serverRevision: syncedRev as BankRevisionNumber,
          lastSyncedAt: new Date().toISOString(),
          etag: `W/rev-${syncedRev}`,
          totalCanonicalCount: diffPreview.remoteCanonicalCount,
        };
        await db.bankSyncMeta.put({
          blockId,
          serverRevision: syncedRev,
          lastSyncedAt: alignedCursor.lastSyncedAt,
          etag: alignedCursor.etag,
          totalCanonicalCount: alignedCursor.totalCanonicalCount,
        });
        diffPreview = {
          ...diffPreview,
          localRevision: syncedRev,
          remoteRevision: syncedRev,
          isOutOfDate: false,
          hasChanges: false,
        };
        set({ syncCursor: alignedCursor });
      }

      const retainedByUser =
        !options.force &&
        get().dismissedRemoteRevision !== null &&
        Number(get().dismissedRemoteRevision) === Number(diffPreview.remoteRevision);

      if ((diffPreview.hasChanges || diffPreview.isOutOfDate) && !retainedByUser) {
        set({
          pendingDiffPreview: diffPreview,
          isSyncing: false,
          syncPhase: 'changes-detected',
          dismissedRemoteRevision: options.force ? null : get().dismissedRemoteRevision,
        });
      } else if (retainedByUser) {
        set({
          pendingDiffPreview: diffPreview,
          isSyncing: false,
          syncPhase: 'local-retained',
        });
      } else {
        set({
          pendingDiffPreview: diffPreview,
          isSyncing: false,
          syncPhase: 'up-to-date',
        });
      }

      return diffPreview;
    } catch (err) {
      console.warn('[useQuestionStore] Diff check deferred:', err);
      set({ isSyncing: false, syncPhase: 'idle' });
      return null;
    }
  },

  applyPendingGlobalMerge: async (blockId = 'cvs') => {
    set({ isSyncing: true, syncPhase: 'applying-merge', error: null });
    try {
      let preview = get().pendingDiffPreview;
      if (!preview || preview.blockId !== blockId) {
        preview = await get().checkForGlobalUpdates(blockId);
      }

      if (!preview) {
        set({ isSyncing: false, syncPhase: 'idle' });
        return null;
      }

      const currentQuestions = (await db.questions
        .where('blockId')
        .equals(blockId)
        .toArray()) as GovernedQuestion[];

      const mergeOutcome = mergeStrategy.mergeGlobalDeltaIntoLocal({
        blockId,
        currentLocalQuestions: currentQuestions,
        incomingGlobalQuestions: preview.rawDelta.upsertedQuestions,
        archivedGlobalIds: preview.rawDelta.archivedQuestionIds,
        previousRevision: preview.localRevision,
        newRevision: preview.rawDelta.revision,
        syncedAt: preview.rawDelta.syncedAt,
      });

      // Persist all merged questions (including quarantined tombstones) to IndexedDB
      await db.questions.bulkPut([...mergeOutcome.mergedQuestions] as unknown as Question[]);

      const activeQuestions = filterActiveQuestions(mergeOutcome.mergedQuestions);

      // Persist new sync cursor
      const newCursor: BankSyncCursor = {
        blockId,
        serverRevision: preview.rawDelta.revision,
        lastSyncedAt: preview.rawDelta.syncedAt,
        etag: preview.rawDelta.etag,
        totalCanonicalCount: activeQuestions.filter(
          (q) => (q as GovernedQuestion).provenanceScope !== 'local-custom'
        ).length,
      };

      await db.bankSyncMeta.put({
        blockId,
        serverRevision: Number(newCursor.serverRevision),
        lastSyncedAt: newCursor.lastSyncedAt,
        etag: newCursor.etag,
        totalCanonicalCount: newCursor.totalCanonicalCount,
      });

      // Recompute clean up-to-date preview
      const updatedPreview: BankVersionDiffPreview = {
        ...preview,
        localRevision: Number(newCursor.serverRevision),
        remoteRevision: Number(newCursor.serverRevision),
        localTotalCount: activeQuestions.length,
        isOutOfDate: false,
        hasChanges: false,
        addedQuestions: [],
        editedQuestions: [],
        deletedQuestions: [],
        checkedAt: new Date().toISOString(),
      };

      set({
        questions: activeQuestions,
        syncCursor: newCursor,
        pendingDiffPreview: updatedPreview,
        dismissedRemoteRevision: null,
        lastMergeReport: mergeOutcome.report,
        isSyncing: false,
        syncPhase: 'up-to-date',
      });

      // Broadcast sync event to peer tabs in the same browser
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('medquests_bank_sync');
          channel.postMessage({
            type: 'BANK_SYNCED',
            blockId,
            revision: newCursor.serverRevision,
          });
          channel.close();
        } catch {
          // Ignore
        }
      }

      return mergeOutcome.report;
    } catch (err) {
      console.warn('[useQuestionStore] Merge application failed:', err);
      set({ isSyncing: false, syncPhase: 'error', error: (err as Error).message });
      return null;
    }
  },

  dismissPendingGlobalMerge: () => {
    const preview = get().pendingDiffPreview;
    set({
      dismissedRemoteRevision: preview ? Number(preview.remoteRevision) : null,
      syncPhase: 'local-retained',
    });
  },

  syncWithGlobalBank: async (blockId = 'cvs', options = { interactive: false }) => {
    if (options.interactive) {
      await get().checkForGlobalUpdates(blockId, { force: true });
      return null;
    }
    await get().checkForGlobalUpdates(blockId, { force: true });
    return await get().applyPendingGlobalMerge(blockId);
  },

  // Dual Action 1: Save Locally to Device (Private Sandbox, 0ms)
  ingestQuestions: async (rawInput: string | unknown[]) => {
    let parsed: unknown[];
    if (typeof rawInput === 'string') {
      try {
        parsed = JSON.parse(rawInput);
      } catch (e) {
        return { count: 0, errors: [`JSON Parse Error: ${(e as Error).message}`] };
      }
    } else {
      parsed = rawInput;
    }

    if (!Array.isArray(parsed)) {
      return { count: 0, errors: ['Input must be a JSON array of questions'] };
    }

    const validated: Question[] = [];
    const errors: string[] = [];

    parsed.forEach((item, index) => {
      const res = QuestionSchema.safeParse(item);
      if (res.success) {
        const customItem: GovernedQuestion = {
          ...res.data,
          provenanceScope: 'local-custom',
          editorialStatus: 'local_draft',
          stemHash: QuestionCanonicalHasher.computeStemHashSync(res.data.stem),
          globalRevision: 0,
          authorId: 'usr-local-author',
          authorDisplayName: 'Local Author',
          reviewedById: null,
          reviewedByDisplayName: null,
          reviewerNotes: null,
          publishedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        validated.push(customItem as Question);
      } else {
        const issues = res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        errors.push(`Item #${index + 1}: ${issues}`);
      }
    });

    if (validated.length > 0) {
      await db.questions.bulkPut(validated);
      const current = get().questions;
      const map = new Map<string, Question>();
      current.forEach((q) => map.set(q.id, q));
      validated.forEach((q) => map.set(q.id, q));
      set({ questions: filterActiveQuestions(Array.from(map.values())) });
    }

    return { count: validated.length, errors, ingested: validated };
  },

  // Dual Action 2: Save Locally AND Submit for Global Curriculum Review
  submitQuestionsForGlobalReview: async (
    rawInput: string | unknown[],
    authorContext = {
      authorId: 'usr_local_author',
      authorDisplayName: 'Medical Scholar',
      authorRole: 'student-pro',
    }
  ) => {
    const localResult = await get().ingestQuestions(rawInput);
    if (localResult.errors.length > 0 && localResult.count === 0) {
      return { count: 0, errors: localResult.errors, ticketCount: 0 };
    }

    const candidates =
      localResult.ingested && localResult.ingested.length > 0
        ? localResult.ingested
        : get().questions.slice(-localResult.count);

    if (candidates.length === 0) {
      return { count: 0, errors: localResult.errors, ticketCount: 0 };
    }

    const submissionRes = await edgeQuestionBankGateway.submitQuestionsForGlobalReview({
      questions: candidates,
      authorId: authorContext.authorId || 'usr_local_author',
      authorDisplayName: authorContext.authorDisplayName || 'Medical Scholar',
      authorRole: authorContext.authorRole || 'student-pro',
    });

    if (!submissionRes.ok) {
      return {
        count: localResult.count,
        errors: [...localResult.errors, `Review queue submission warning: ${submissionRes.error.code}`],
        ticketCount: 0,
      };
    }

    const acceptedQuestionIds = new Set(
      submissionRes.value.submittedTickets.map((ticket) => ticket.question.id)
    );

    const updatedSubmittedQuestions = candidates
      .filter((q) => acceptedQuestionIds.has(q.id))
      .map((q) => ({
        ...q,
        provenanceScope: 'submitted-pending' as const,
        editorialStatus: 'pending_review' as const,
        authorId: authorContext.authorId || 'usr_local_author',
        authorDisplayName: authorContext.authorDisplayName || 'Medical Scholar',
        updatedAt: new Date().toISOString(),
      }));

    await db.questions.bulkPut(updatedSubmittedQuestions as unknown as Question[]);

    const currentMap = new Map<string, Question>();
    get().questions.forEach((q) => currentMap.set(q.id, q));
    updatedSubmittedQuestions.forEach((q) => currentMap.set(q.id, q as unknown as Question));
    set({ questions: filterActiveQuestions(Array.from(currentMap.values())) });

    await get().loadMySubmissions(authorContext.authorId);

    return {
      count: localResult.count,
      errors: localResult.errors,
      ticketCount: submissionRes.value.submittedTickets.length,
    };
  },

  loadMySubmissions: async (authorId = 'usr_local_author') => {
    try {
      const res = await edgeQuestionBankGateway.listMySubmissions(authorId);
      if (res.ok) {
        set({ mySubmissions: [...res.value] });
      }
    } catch {
      // Ignore
    }
  },

  exportBankJson: (blockId = 'cvs') => {
    const authState = useAuthStore.getState().authState;
    const isAdmin = authState.status === 'authenticated-active' && authState.user.role === 'admin';
    if (!isAdmin) {
      const actorId = authState.status === 'authenticated-active' ? authState.user.id : 'usr_anonymous';
      const actorName = authState.status === 'authenticated-active' ? authState.user.displayName : 'Local Scholar';
      const actorRole = authState.status === 'authenticated-active' ? authState.user.role : 'unauthenticated';

      edgeAuthGateway.logSecurityAudit({
        actorUserId: actorId,
        actorDisplayName: `${actorName} (${actorRole})`,
        targetUserId: actorId,
        targetDisplayName: `Question Bank [${blockId.toUpperCase()}]`,
        action: 'QUESTION_BANK_EXPORTED',
        summary: `BLOCKED unauthorized export attempt of question bank by ${actorName} [Role: ${actorRole}]. Admin privileges strictly required.`,
        edgeColo: 'CAI',
        latencyMs: 0.9,
      });

      useAuthStore.setState({ auditLogs: [...edgeAuthGateway.getAuditLogs()] });

      throw new Error(
        'Access Denied (403): Exporting the question bank is strictly restricted to Authoritative Platform Administrators within the Admin Governance Dashboard.'
      );
    }

    const list = get().questions.filter((q) => !blockId || q.blockId === blockId);

    // Record verified administrative export in immutable security audit trail
    edgeAuthGateway.logSecurityAudit({
      actorUserId: authState.user.id,
      actorDisplayName: authState.user.displayName,
      targetUserId: authState.user.id,
      targetDisplayName: `Authoritative Curriculum [${blockId.toUpperCase()}]`,
      action: 'QUESTION_BANK_EXPORTED',
      summary: `Exported authoritative question bank for block [${blockId.toUpperCase()}] (${list.length} questions, Rev #${get().syncCursor?.serverRevision ?? 1})`,
      edgeColo: 'CAI',
      latencyMs: 1.2,
    });

    useAuthStore.setState({ auditLogs: [...edgeAuthGateway.getAuditLogs()] });

    return JSON.stringify(list, null, 2);
  },

  clearBank: async (blockId = 'cvs') => {
    await db.transaction('rw', db.questions, db.bankSyncMeta, async () => {
      await db.questions.where('blockId').equals(blockId).delete();
      await db.bankSyncMeta.delete(blockId);
    });
    set({
      questions: [],
      syncCursor: null,
      pendingDiffPreview: null,
      dismissedRemoteRevision: null,
      syncPhase: 'idle',
    });
  },

  resetLocalBankToGlobal: async (blockId = 'cvs') => {
    set({ isSyncing: true, syncPhase: 'resetting-bank', error: null });
    try {
      // 1. Capture the pre-reset state for an exact, user-facing report.
      const previousQuestions = (await db.questions
        .where('blockId')
        .equals(blockId)
        .toArray()) as GovernedQuestion[];
      const prevCursor = await db.bankSyncMeta.get(blockId);
      const previousRevision = prevCursor ? prevCursor.serverRevision : 1;

      // 2. Pull the authoritative canonical snapshot. Network I/O happens BEFORE the
      //    Dexie write transaction so we never hold an IndexedDB lock across the network.
      const deltaRes = await edgeQuestionBankGateway.fetchDeltaSync(blockId, {
        blockId,
        serverRevision: 0 as BankRevisionNumber,
        lastSyncedAt: '',
        etag: '',
        totalCanonicalCount: 0,
      });

      let canonicalQuestions: GovernedQuestion[] = [];
      let revision = Number(previousRevision);
      let etag = prevCursor?.etag || `W/rev-${revision}`;

      if (
        deltaRes.ok &&
        deltaRes.value.upsertedQuestions &&
        deltaRes.value.upsertedQuestions.length > 0
      ) {
        canonicalQuestions = enrichBundledQuestions(
          deltaRes.value.upsertedQuestions as unknown as Question[]
        );
        revision = Number(deltaRes.value.revision);
        etag = deltaRes.value.etag;
      } else if (blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
        canonicalQuestions = enrichBundledQuestions(defaultCvsBank as Question[]);
        revision = Number(edgeQuestionBankGateway.getLocalRevision(blockId) || 1);
        etag = `W/rev-${revision}`;
      }

      // A failed/empty fetch must NEVER wipe a learner's bank.
      if (canonicalQuestions.length === 0) {
        throw new Error(
          'Unable to retrieve the authoritative global bank. Your local bank was left untouched.'
        );
      }

      const nowIso = new Date().toISOString();

      // 3. Non-destructive reset plan: restore canonical, preserve local-custom and
      //    submitted-pending items, soft-archive stale canonical rows instead of deleting them.
      const resetPlan = resetPlanner.buildPlan({
        blockId,
        currentLocalQuestions: previousQuestions,
        canonicalQuestions,
        previousRevision,
        newRevision: revision as BankRevisionNumber,
        syncedAt: nowIso,
      });

      const activeQuestions = filterActiveQuestions(resetPlan.questions);

      // 4. Atomic persistence: questions + sync cursor move together or not at all.
      await db.transaction('rw', db.questions, db.bankSyncMeta, async () => {
        await db.questions.bulkPut([...resetPlan.questions] as unknown as Question[]);
        await db.bankSyncMeta.put({
          blockId,
          serverRevision: revision,
          lastSyncedAt: nowIso,
          etag,
          totalCanonicalCount: canonicalQuestions.length,
        });
      });

      const newCursor: BankSyncCursor = {
        blockId,
        serverRevision: revision as BankRevisionNumber,
        lastSyncedAt: nowIso,
        etag,
        totalCanonicalCount: canonicalQuestions.length,
      };

      const cleanPreview: BankVersionDiffPreview = {
        blockId,
        localRevision: revision,
        remoteRevision: revision,
        remoteEtag: etag,
        localTotalCount: activeQuestions.length,
        remoteCanonicalCount: canonicalQuestions.length,
        isOutOfDate: false,
        hasChanges: false,
        addedQuestions: [],
        editedQuestions: [],
        deletedQuestions: [],
        preservedCustomQuestions: [],
        rawDelta: {
          status: 'up-to-date',
          blockId,
          revision: revision as BankRevisionNumber,
          syncedAt: nowIso,
          etag,
          upsertedQuestions: canonicalQuestions,
          archivedQuestionIds: [],
        },
        checkedAt: nowIso,
      };

      set({
        questions: activeQuestions,
        syncCursor: newCursor,
        pendingDiffPreview: cleanPreview,
        dismissedRemoteRevision: null,
        lastMergeReport: resetPlan.report,
        isSyncing: false,
        syncPhase: 'up-to-date',
      });

      // 5. Notify peer tabs in the same browser so every open tab converges instantly.
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('medquests_bank_sync');
          channel.postMessage({
            type: 'BANK_RESET_COMPLETED',
            blockId,
            revision,
          });
          channel.close();
        } catch {
          // Ignore
        }
      }

      return {
        resetCount: activeQuestions.length,
        revision,
        report: resetPlan.report,
      };
    } catch (err) {
      console.error('[useQuestionStore] Reset to global bank failed:', err);
      set({ isSyncing: false, syncPhase: 'error', error: (err as Error).message });
      throw err;
    }
  },
}));

// =========================================================================
// BACKGROUND SYNC REVALIDATION ENGINE (Multi-tab, Admin Event, Focus & 60s Pulse)
// =========================================================================
if (typeof window !== 'undefined') {
  // 1. Cross-Tab Instant Synchronization (0ms)
  if ('BroadcastChannel' in window) {
    try {
      const rxChannel = new BroadcastChannel('medquests_bank_sync');
      rxChannel.onmessage = (event) => {
        const type = event.data?.type;
        const activeBlock = useQuestionStore.getState().activeBlockId;
        if (type === 'BANK_SYNCED' || type === 'BANK_RESET_COMPLETED') {
          useQuestionStore.getState().loadQuestions(activeBlock);
        } else if (type === 'GLOBAL_BANK_MUTATED') {
          useQuestionStore.getState().checkForGlobalUpdates(activeBlock);
        }
      };
    } catch {
      // Ignore
    }
  }

  // 2. Same-Tab Admin / Reviewer Mutation Listener (Instant Diff Detection)
  window.addEventListener('medquests:global-bank-mutated', () => {
    const state = useQuestionStore.getState();
    state.checkForGlobalUpdates(state.activeBlockId);
  });

  // 3. Window Focus & Visibility Change Revalidation
  const triggerRevalidation = () => {
    const state = useQuestionStore.getState();
    if (!state.isSyncing) {
      state.checkForGlobalUpdates(state.activeBlockId);
    }
  };

  window.addEventListener('focus', triggerRevalidation);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerRevalidation();
    }
  });

  // 4. Periodic Background Sync Heartbeat (every 60 seconds)
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      triggerRevalidation();
    }
  }, 60000);
}
