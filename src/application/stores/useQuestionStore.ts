import { create } from 'zustand';
import { Question, QuestionSchema } from '../../domain/model/types.ts';
import { db } from '../../infrastructure/storage/db.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { NonDestructiveBankMergeStrategy } from '../../domain/questionBank/nonDestructiveMergeStrategy.ts';
import { QuestionCanonicalHasher } from '../../domain/questionBank/canonicalHasher.ts';
import type {
  BankSyncCursor,
  LocalBankMergeReport,
  GovernedQuestion,
  QuestionReviewSubmission,
  BankRevisionNumber,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

const mergeStrategy = new NonDestructiveBankMergeStrategy();

interface QuestionStoreState {
  questions: Question[];
  activeBlockId: string;
  isLoading: boolean;
  isSyncing: boolean;
  syncCursor: BankSyncCursor | null;
  lastMergeReport: LocalBankMergeReport | null;
  mySubmissions: QuestionReviewSubmission[];
  error: string | null;

  // Actions
  loadQuestions: (blockId?: string) => Promise<void>;
  syncWithGlobalBank: (blockId?: string) => Promise<LocalBankMergeReport | null>;
  ingestQuestions: (rawJson: string | unknown[]) => Promise<{ count: number; errors: string[] }>;
  submitQuestionsForGlobalReview: (
    rawJson: string | unknown[],
    authorContext?: { authorId?: string; authorDisplayName?: string; authorRole?: any }
  ) => Promise<{ count: number; errors: string[]; ticketCount: number }>;
  loadMySubmissions: (authorId?: string) => Promise<void>;
  exportBankJson: () => string;
  clearBank: (blockId?: string) => Promise<void>;
}

export const useQuestionStore = create<QuestionStoreState>((set, get) => ({
  questions: [],
  activeBlockId: 'cvs',
  isLoading: false,
  isSyncing: false,
  syncCursor: null,
  lastMergeReport: null,
  mySubmissions: [],
  error: null,

  loadQuestions: async (blockId = 'cvs') => {
    set({ isLoading: true, error: null });
    try {
      // 1. Instant 0ms Local Hydration from IndexedDB
      let stored = await db.questions.where('blockId').equals(blockId).toArray();
      if (stored.length === 0 && blockId === 'cvs' && Array.isArray(defaultCvsBank)) {
        await db.questions.bulkPut(defaultCvsBank as Question[]);
        stored = defaultCvsBank as Question[];
      }

      // 2. Read local sync cursor
      const cursorRecord = await db.bankSyncMeta.get(blockId);
      const cursor: BankSyncCursor | null = cursorRecord
        ? {
            blockId,
            serverRevision: cursorRecord.serverRevision as BankRevisionNumber,
            lastSyncedAt: cursorRecord.lastSyncedAt,
            etag: cursorRecord.etag,
            totalCanonicalCount: cursorRecord.totalCanonicalCount,
          }
        : null;

      set({
        questions: stored,
        activeBlockId: blockId,
        syncCursor: cursor,
        isLoading: false,
      });

      // 3. Background non-blocking sync revalidation
      get().syncWithGlobalBank(blockId);
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  syncWithGlobalBank: async (blockId = 'cvs') => {
    set({ isSyncing: true });
    try {
      const cursor = get().syncCursor;
      const syncResult = await edgeQuestionBankGateway.fetchDeltaSync(blockId, cursor);

      if (!syncResult.ok) {
        set({ isSyncing: false });
        return null;
      }

      const delta = syncResult.value;

      if (delta.status === 'up-to-date') {
        set({ isSyncing: false });
        return null;
      }

      // Merge incoming global delta into local Dexie store
      const currentQuestions = (await db.questions.where('blockId').equals(blockId).toArray()) as GovernedQuestion[];

      const mergeOutcome = mergeStrategy.mergeGlobalDeltaIntoLocal({
        blockId,
        currentLocalQuestions: currentQuestions,
        incomingGlobalQuestions: delta.upsertedQuestions,
        archivedGlobalIds: delta.archivedQuestionIds,
        newRevision: delta.revision,
        syncedAt: delta.syncedAt,
      });

      // Bulk persist to IndexedDB
      await db.questions.bulkPut([...mergeOutcome.mergedQuestions] as unknown as Question[]);

      // Persist new sync cursor
      const newCursor: BankSyncCursor = {
        blockId,
        serverRevision: delta.revision,
        lastSyncedAt: delta.syncedAt,
        etag: delta.etag,
        totalCanonicalCount: mergeOutcome.mergedQuestions.filter((q) => q.status !== 'quarantined').length,
      };

      await db.bankSyncMeta.put({
        blockId,
        serverRevision: Number(newCursor.serverRevision),
        lastSyncedAt: newCursor.lastSyncedAt,
        etag: newCursor.etag,
        totalCanonicalCount: newCursor.totalCanonicalCount,
      });

      set({
        questions: [...mergeOutcome.mergedQuestions] as unknown as Question[],
        syncCursor: newCursor,
        lastMergeReport: mergeOutcome.report,
        isSyncing: false,
      });

      return mergeOutcome.report;
    } catch (err) {
      console.warn('[useQuestionStore] Background delta sync deferred:', err);
      set({ isSyncing: false });
      return null;
    }
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
        // Stamp local-custom provenance
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
      set({ questions: Array.from(map.values()) });
    }

    return { count: validated.length, errors };
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
    // 1. Ingest locally first so the author can practice immediately
    const localResult = await get().ingestQuestions(rawInput);
    if (localResult.errors.length > 0 && localResult.count === 0) {
      return { count: 0, errors: localResult.errors, ticketCount: 0 };
    }

    // 2. Fetch the newly saved local items
    const allQuestions = get().questions;
    const candidates = allQuestions.slice(-localResult.count);

    // 3. Dispatch to Global Review Queue
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

    // Refresh author's own submissions
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

  exportBankJson: () => {
    const list = get().questions;
    return JSON.stringify(list, null, 2);
  },

  clearBank: async (blockId = 'cvs') => {
    await db.questions.where('blockId').equals(blockId).delete();
    set({ questions: [] });
  },
}));
