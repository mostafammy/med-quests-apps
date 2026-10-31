import { create } from 'zustand';
import type {
  GovernedQuestion,
  QuestionReviewSubmission,
  EditorialAuditLogEntry,
  GlobalBankGovernanceKpis,
  QuestionCuratorFilterCriteria,
  EditorialDecisionCommand,
  QuestionMutationPatch,
} from '../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { QuestionSpecificationBuilder } from '../../domain/questionBank/questionSpecifications.ts';
import type { Question } from '../../domain/model/types.ts';

interface BankGovernanceStoreState {
  activeWorkspaceTab: 'review-queue' | 'canonical-curator';
  reviewQueue: QuestionReviewSubmission[];
  catalogQuestions: GovernedQuestion[];
  auditLogs: EditorialAuditLogEntry[];
  kpis: GlobalBankGovernanceKpis | null;
  filterCriteria: QuestionCuratorFilterCriteria;
  selectedTicketId: string | null;
  selectedCatalogQuestionId: string | null;
  isLoading: boolean;
  isActionInProgress: boolean;
  error: string | null;

  // Actions
  setWorkspaceTab: (tab: 'review-queue' | 'canonical-curator') => void;
  loadGovernanceData: (blockId?: string) => Promise<void>;
  setFilter: (patch: Partial<QuestionCuratorFilterCriteria>) => void;
  resetFilters: () => void;
  selectTicket: (ticketId: string | null) => void;
  selectCatalogQuestion: (id: string | null) => void;

  submitReviewDecision: (command: EditorialDecisionCommand) => Promise<boolean>;
  createCanonicalQuestions: (
    questions: Question[],
    actor: { id: string; displayName: string; role: any }
  ) => Promise<boolean>;
  updateCanonicalQuestion: (
    questionId: string,
    patch: QuestionMutationPatch,
    reason: string,
    actor: { id: string; displayName: string; role: any }
  ) => Promise<boolean>;
  setArchiveStatus: (
    questionId: string,
    archive: boolean,
    reason: string,
    actor: { id: string; displayName: string; role: any }
  ) => Promise<boolean>;
  deleteCanonicalQuestion: (
    questionId: string,
    reason: string,
    actor: { id: string; displayName: string; role: any },
    permanent?: boolean
  ) => Promise<boolean>;

  // Selectors
  getFilteredCatalog: () => GovernedQuestion[];
  getFilteredQueue: () => QuestionReviewSubmission[];
}

const DEFAULT_FILTERS: QuestionCuratorFilterCriteria = {
  blockId: 'cvs',
  subjectId: 'all',
  chapterId: 'all',
  editorialStatus: 'all',
  difficulty: 'all',
  highYieldOnly: false,
  searchQuery: '',
};

export const useBankGovernanceStore = create<BankGovernanceStoreState>((set, get) => ({
  activeWorkspaceTab: 'review-queue',
  reviewQueue: [],
  catalogQuestions: [],
  auditLogs: [],
  kpis: null,
  filterCriteria: DEFAULT_FILTERS,
  selectedTicketId: null,
  selectedCatalogQuestionId: null,
  isLoading: false,
  isActionInProgress: false,
  error: null,

  setWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),

  loadGovernanceData: async (blockId = 'cvs') => {
    set({ isLoading: true, error: null });
    try {
      const [queueRes, catalogRes] = await Promise.all([
        edgeQuestionBankGateway.listReviewQueue(blockId),
        edgeQuestionBankGateway.listGlobalBankCatalog(blockId),
      ]);

      const queue = queueRes.ok ? [...queueRes.value] : [];
      const catalog = catalogRes.ok ? [...catalogRes.value.questions] : [];
      const logs = catalogRes.ok ? [...catalogRes.value.auditLogs] : [];
      const kpis = catalogRes.ok ? catalogRes.value.kpis : null;

      set({
        reviewQueue: queue,
        catalogQuestions: catalog,
        auditLogs: logs,
        kpis,
        selectedTicketId: queue.length > 0 ? queue[0].ticketId : null,
        selectedCatalogQuestionId: catalog.length > 0 ? catalog[0].id : null,
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setFilter: (patch) => {
    set((state) => ({
      filterCriteria: { ...state.filterCriteria, ...patch },
    }));
  },

  resetFilters: () => set({ filterCriteria: DEFAULT_FILTERS }),

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),
  selectCatalogQuestion: (id) => set({ selectedCatalogQuestionId: id }),

  submitReviewDecision: async (command) => {
    set({ isActionInProgress: true, error: null });
    try {
      const res = await edgeQuestionBankGateway.submitReviewDecision(command);
      if (res.ok) {
        await get().loadGovernanceData('cvs');
        set({ isActionInProgress: false });
        return true;
      } else {
        set({ error: res.error.code, isActionInProgress: false });
        return false;
      }
    } catch (err) {
      set({ error: (err as Error).message, isActionInProgress: false });
      return false;
    }
  },

  createCanonicalQuestions: async (questions, actor) => {
    set({ isActionInProgress: true, error: null });
    try {
      const res = await edgeQuestionBankGateway.createCanonicalQuestions({
        questions,
        actorId: actor.id,
        actorDisplayName: actor.displayName,
        actorRole: actor.role,
      });
      if (res.ok) {
        await get().loadGovernanceData('cvs');
        set({ isActionInProgress: false });
        return true;
      } else {
        set({ error: res.error.code, isActionInProgress: false });
        return false;
      }
    } catch (err) {
      set({ error: (err as Error).message, isActionInProgress: false });
      return false;
    }
  },

  updateCanonicalQuestion: async (questionId, patch, reason, actor) => {
    set({ isActionInProgress: true, error: null });
    try {
      const res = await edgeQuestionBankGateway.updateCanonicalQuestion({
        questionId,
        patch,
        changeReason: reason,
        actorId: actor.id,
        actorDisplayName: actor.displayName,
        actorRole: actor.role,
      });
      if (res.ok) {
        await get().loadGovernanceData('cvs');
        set({ isActionInProgress: false });
        return true;
      } else {
        set({ error: res.error.code, isActionInProgress: false });
        return false;
      }
    } catch (err) {
      set({ error: (err as Error).message, isActionInProgress: false });
      return false;
    }
  },

  setArchiveStatus: async (questionId, archive, reason, actor) => {
    set({ isActionInProgress: true, error: null });
    try {
      const res = await edgeQuestionBankGateway.setCanonicalArchiveStatus({
        questionId,
        archive,
        reason,
        actorId: actor.id,
        actorDisplayName: actor.displayName,
        actorRole: actor.role,
      });
      if (res.ok) {
        await get().loadGovernanceData('cvs');
        set({ isActionInProgress: false });
        return true;
      } else {
        set({ error: res.error.code, isActionInProgress: false });
        return false;
      }
    } catch (err) {
      set({ error: (err as Error).message, isActionInProgress: false });
      return false;
    }
  },

  deleteCanonicalQuestion: async (questionId, reason, actor, permanent = true) => {
    set({ isActionInProgress: true, error: null });
    try {
      const res = await edgeQuestionBankGateway.deleteCanonicalQuestion({
        questionId: questionId as any,
        actorId: actor.id,
        actorDisplayName: actor.displayName,
        actorRole: actor.role,
        reason,
        permanent,
      });
      if (res.ok) {
        await get().loadGovernanceData('cvs');
        set({ isActionInProgress: false });
        return true;
      } else {
        set({ error: res.error.code, isActionInProgress: false });
        return false;
      }
    } catch (err) {
      set({ error: (err as Error).message, isActionInProgress: false });
      return false;
    }
  },

  getFilteredCatalog: () => {
    const { catalogQuestions, filterCriteria } = get();
    const spec = QuestionSpecificationBuilder.build(filterCriteria);
    return catalogQuestions.filter((q) => spec.isSatisfiedBy(q));
  },

  getFilteredQueue: () => {
    const { reviewQueue, filterCriteria } = get();
    return reviewQueue.filter((ticket) => {
      if (filterCriteria.subjectId && filterCriteria.subjectId !== 'all') {
        if (ticket.question.subjectId !== filterCriteria.subjectId) return false;
      }
      if (filterCriteria.chapterId && filterCriteria.chapterId !== 'all') {
        if (ticket.question.chapterId !== filterCriteria.chapterId) return false;
      }
      if (filterCriteria.editorialStatus && filterCriteria.editorialStatus !== 'all') {
        if (ticket.editorialStatus !== filterCriteria.editorialStatus) return false;
      }
      if (filterCriteria.searchQuery && filterCriteria.searchQuery.trim().length > 0) {
        const query = filterCriteria.searchQuery.toLowerCase();
        const blob = `${ticket.question.stem} ${ticket.question.concept} ${ticket.submittedByDisplayName}`.toLowerCase();
        if (!blob.includes(query)) return false;
      }
      return true;
    });
  },
}));
