import { create } from 'zustand';
import type { Question } from '../../domain/model/types.ts';
import { db } from '../../infrastructure/storage/db.ts';
import type { BlockId } from '../../domain/curriculum/ids.ts';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import type { UserRole } from '../../domain/auth/types.ts';
import type {
  BankSyncCursor,
  LocalBankMergeReport,
  QuestionReviewSubmission,
  BankVersionDiffPreview,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import {
  applyGlobalMergeToLocalDb,
  executeNonDestructiveBankReset,
  hydrateLocalBlockBank,
  probeAndComputeGlobalDiff,
} from './questionBankSyncOrchestrator.ts';
import {
  exportAuthoritativeBankJson,
  submitQuestionsForGlobalReviewWithQdd,
  validateAndIngestLocalQuestions,
} from './questionBankIngestionAndExportService.ts';

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

export interface QuestionStoreState {
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
    duplicateWarnings?: string[];
  }>;
  submitQuestionsForGlobalReview: (
    rawJson: string | unknown[],
    authorContext?: {
      authorId?: string;
      authorDisplayName?: string;
      authorRole?: UserRole;
    }
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

const useQuestionStoreBase = create<QuestionStoreState>((set, get) => ({
  questions: [],
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

  loadQuestions: async (blockId?: string) => {
    const targetBlockId = (blockId || get().activeBlockId || 'cvs') as BlockId;
    set({ isLoading: true, error: null });
    try {
      const { activeStored, cursor } = await hydrateLocalBlockBank(targetBlockId);

      set({
        questions: activeStored,
        activeBlockId: targetBlockId,
        syncCursor: cursor,
        isLoading: false,
      });

      void get().checkForGlobalUpdates(targetBlockId);
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false, syncPhase: 'error' });
    }
  },

  checkForGlobalUpdates: async (blockId = 'cvs', options: { force?: boolean } = {}) => {
    set({ isSyncing: true, syncPhase: 'probing-edge', error: null });
    try {
      const outcome = await probeAndComputeGlobalDiff({
        blockId,
        force: options.force,
        currentSyncCursor: get().syncCursor,
        dismissedRemoteRevision: get().dismissedRemoteRevision,
        onComputingDiff: () => set({ syncPhase: 'computing-diff' }),
      });

      if (!outcome.preview) {
        set({ isSyncing: false, syncPhase: 'idle' });
        return null;
      }

      set({
        ...(outcome.alignedCursor ? { syncCursor: outcome.alignedCursor } : {}),
        pendingDiffPreview: outcome.preview,
        isSyncing: false,
        syncPhase: outcome.phase,
        ...(outcome.clearDismissedRevision ? { dismissedRemoteRevision: null } : {}),
      });

      return outcome.preview;
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

      const { activeQuestions, newCursor, updatedPreview, report } =
        await applyGlobalMergeToLocalDb(blockId, preview);

      set({
        questions: activeQuestions,
        syncCursor: newCursor,
        pendingDiffPreview: updatedPreview,
        dismissedRemoteRevision: null,
        lastMergeReport: report,
        isSyncing: false,
        syncPhase: 'up-to-date',
      });

      return report;
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

  ingestQuestions: async (rawInput: string | unknown[]) => {
    const res = await validateAndIngestLocalQuestions({
      rawInput,
      activeBlockId: get().activeBlockId,
      currentQuestions: get().questions,
    });
    if (res.updatedQuestions) {
      set({ questions: res.updatedQuestions });
    }
    return {
      count: res.count,
      errors: res.errors,
      ingested: res.ingested,
      duplicateWarnings: res.duplicateWarnings,
    };
  },

  submitQuestionsForGlobalReview: async (
    rawInput: string | unknown[],
    authorContext = {
      authorId: 'usr_local_author',
      authorDisplayName: 'Medical Scholar',
      authorRole: 'student-pro' as UserRole,
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

    const submissionOutcome = await submitQuestionsForGlobalReviewWithQdd({
      candidates,
      localCount: localResult.count,
      localErrors: localResult.errors,
      currentQuestions: get().questions,
      authorContext,
    });

    if (submissionOutcome.updatedQuestions) {
      set({ questions: submissionOutcome.updatedQuestions });
      await get().loadMySubmissions(authorContext.authorId);
    }

    return {
      count: submissionOutcome.count,
      errors: submissionOutcome.errors,
      ticketCount: submissionOutcome.ticketCount,
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
    return exportAuthoritativeBankJson({
      blockId,
      questions: get().questions,
      syncCursor: get().syncCursor,
    });
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
      const { activeQuestions, newCursor, cleanPreview, report, revision } =
        await executeNonDestructiveBankReset(blockId);

      set({
        questions: activeQuestions,
        syncCursor: newCursor,
        pendingDiffPreview: cleanPreview,
        dismissedRemoteRevision: null,
        lastMergeReport: report,
        isSyncing: false,
        syncPhase: 'up-to-date',
      });

      return {
        resetCount: activeQuestions.length,
        revision,
        report,
      };
    } catch (err) {
      console.error('[useQuestionStore] Reset to global bank failed:', err);
      set({ isSyncing: false, syncPhase: 'error', error: (err as Error).message });
      throw err;
    }
  },
}));

export const useQuestionStore = Object.assign(
  function useQuestionStore<U = QuestionStoreState>(
    selector?: (state: QuestionStoreState) => U
  ): U {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const state = useQuestionStoreBase.getState();
      return selector ? selector(state) : (state as unknown as U);
    }
    return useQuestionStoreBase(selector as (state: QuestionStoreState) => U);
  },
  useQuestionStoreBase
) as typeof useQuestionStoreBase;

// =========================================================================
// BACKGROUND SYNC REVALIDATION ENGINE (Multi-tab, Admin Event, Focus & 60s Pulse)
// =========================================================================
if (typeof window !== 'undefined') {
  if ('BroadcastChannel' in window) {
    try {
      const rxChannel = new BroadcastChannel('medquests_bank_sync');
      rxChannel.onmessage = (event) => {
        const type = event.data?.type;
        const activeBlock = useQuestionStore.getState().activeBlockId;
        if (type === 'BANK_SYNCED' || type === 'BANK_RESET_COMPLETED') {
          void useQuestionStore.getState().loadQuestions(activeBlock);
        } else if (type === 'GLOBAL_BANK_MUTATED') {
          void useQuestionStore.getState().checkForGlobalUpdates(activeBlock);
        }
      };
    } catch {
      // Ignore
    }
  }

  window.addEventListener('medquests:global-bank-mutated', () => {
    const state = useQuestionStore.getState();
    void state.checkForGlobalUpdates(state.activeBlockId);
  });

  const triggerRevalidation = () => {
    const state = useQuestionStore.getState();
    if (!state.isSyncing) {
      void state.checkForGlobalUpdates(state.activeBlockId);
    }
  };

  window.addEventListener('focus', triggerRevalidation);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerRevalidation();
    }
  });

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      triggerRevalidation();
    }
  }, 60000);
}
