import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { useBankGovernanceStore } from '../../../application/stores/useBankGovernanceStore.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { useBlockContextStore } from '../../../application/stores/useBlockContextStore.ts';
import { compositionRoot } from '../../../application/composition/clientCompositionRoot.ts';
import { AiPromptStudioModal } from './AiPromptStudioModal.tsx';
import { AdminExportBankModal } from './AdminExportBankModal.tsx';
import {
  CanonicalQuestionEditModal,
  CanonicalQuestionDeleteModal,
} from './CanonicalQuestionModals.tsx';
import type {
  GovernedQuestion,
  QuestionMutationPatch,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import { GovernanceKpiHeader } from './questionBankGovernance/GovernanceKpiHeader.tsx';
import { GovernanceReviewQueueTab } from './questionBankGovernance/GovernanceReviewQueueTab.tsx';
import { GovernanceCatalogTab } from './questionBankGovernance/GovernanceCatalogTab.tsx';

export const QuestionBankGovernancePanel: React.FC = () => {
  const { activeBlockId: globalActiveBlockId } = useBlockContextStore();
  const activeBlockPack = compositionRoot.catalog.get(globalActiveBlockId);

  const {
    activeBlockId,
    activeWorkspaceTab,
    reviewQueue,
    catalogQuestions,
    kpis,
    filterCriteria,
    selectedTicketId,
    isLoading,
    isActionInProgress,
    setWorkspaceTab,
    loadGovernanceData,
    setFilter,
    selectTicket,
    submitReviewDecision,
    createCanonicalQuestions,
    setArchiveStatus,
    deleteCanonicalQuestion,
    getFilteredCatalog,
    getFilteredQueue,
  } = useBankGovernanceStore();

  const { authState } = useAuthStore();
  const { resetLocalBankToGlobal } = useQuestionStore();
  const { t } = useLocaleStore();

  const isAdmin =
    authState.status === 'authenticated-active' &&
    authState.user.role === 'admin';
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Local state for reviewer actions
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineStem, setInlineStem] = useState('');
  const [inlineExplanation, setInlineExplanation] = useState('');
  const [isResettingCache, setIsResettingCache] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Modal state for creating canonical items
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createJsonInput, setCreateJsonInput] = useState('');

  // Modal state for editing an existing canonical item in-place
  const [editingCanonicalQuestion, setEditingCanonicalQuestion] =
    useState<GovernedQuestion | null>(null);
  const [showAuditBoard, setShowAuditBoard] = useState(false);

  // Modal state for deleting a question
  const [deletingQuestion, setDeletingQuestion] =
    useState<GovernedQuestion | null>(null);

  // Modal state for AI Prompt Studio
  const [isPromptStudioOpen, setIsPromptStudioOpen] = useState(false);

  useEffect(() => {
    loadGovernanceData(globalActiveBlockId);
  }, [loadGovernanceData, globalActiveBlockId]);

  const currentSubjects = compositionRoot.catalog.subjects(globalActiveBlockId);

  const filteredCatalog = getFilteredCatalog();
  const filteredQueue = getFilteredQueue();

  const activeTicket =
    reviewQueue.find((t) => t.ticketId === selectedTicketId) ||
    filteredQueue[0] ||
    null;

  useEffect(() => {
    if (activeTicket) {
      setInlineStem(activeTicket.question.stem);
      setInlineExplanation(activeTicket.question.explanation);
      setIsInlineEditing(false);
      setReviewerNotes('');
    }
  }, [activeTicket]);

  const handleResetLocalCache = async () => {
    if (!window.confirm(t.studio.resetConfirmDialog)) {
      return;
    }
    try {
      setIsResettingCache(true);
      const res = await resetLocalBankToGlobal(activeBlockId);
      await loadGovernanceData(activeBlockId);
      setResetFeedback(
        `Local cache reset: ${res.resetCount} items restored (Rev #${res.revision})`
      );
      setTimeout(() => setResetFeedback(null), 5000);
    } catch {
      // Ignored
    } finally {
      setIsResettingCache(false);
    }
  };

  const currentActor = {
    id: authState.user?.id || 'usr_faculty_admin',
    displayName: authState.user?.displayName || 'Faculty Reviewer',
    role: authState.user?.role || 'faculty-reviewer',
  };

  const handleDecision = async (
    decision: 'approve_and_publish' | 'request_changes' | 'reject_submission'
  ) => {
    if (!activeTicket) return;

    let inlinePatch: QuestionMutationPatch | undefined = undefined;
    if (
      isInlineEditing &&
      (inlineStem !== activeTicket.question.stem ||
        inlineExplanation !== activeTicket.question.explanation)
    ) {
      inlinePatch = {
        stem: inlineStem,
        explanation: inlineExplanation,
      };
    }

    await submitReviewDecision({
      ticketId: activeTicket.ticketId,
      questionId: activeTicket.question.id,
      reviewerUserId: currentActor.id,
      reviewerDisplayName: currentActor.displayName,
      reviewerRole: currentActor.role,
      decision,
      reviewerNotes,
      inlinePatch,
    });

    setReviewerNotes('');
    setIsInlineEditing(false);
  };

  const handleArchiveToggle = async (question: GovernedQuestion) => {
    const isArchived = question.editorialStatus === 'archived';
    const reason = prompt(
      isArchived
        ? 'Reason for restoring question:'
        : 'Reason for soft-retiring / archiving question:',
      isArchived
        ? 'Restored by curriculum committee'
        : 'Outdated diagnostic guidelines'
    );
    if (!reason) return;

    await setArchiveStatus(question.id, !isArchived, reason, currentActor);
  };

  const handleOpenEditModal = (q: GovernedQuestion) => {
    setEditingCanonicalQuestion(q);
  };

  const handleConfirmDelete = async (
    targetQuestion: GovernedQuestion,
    mode: 'permanent' | 'archive',
    reason: string
  ) => {
    const isPermanent = mode === 'permanent';
    const success = await deleteCanonicalQuestion(
      targetQuestion.id,
      reason ||
        (isPermanent
          ? 'Permanent deletion from canonical bank'
          : 'Archived question'),
      currentActor,
      isPermanent
    );
    if (success) {
      setActionFeedback(
        isPermanent
          ? `Question ${targetQuestion.id} has been permanently deleted from the global bank.`
          : `Question ${targetQuestion.id} has been archived.`
      );
      setTimeout(() => setActionFeedback(null), 5000);
      if (editingCanonicalQuestion?.id === targetQuestion.id) {
        setEditingCanonicalQuestion(null);
      }
      setDeletingQuestion(null);
    }
  };

  const highlightMatch = (text: string, query?: string) => {
    if (!query || !query.trim() || !text) return text;
    const cleanTerms = query
      .trim()
      .replace(/^["'“‘](.*)["'”’]$/, '$1')
      .split(/\s+/)
      .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
      .filter((t) => t.length > 1);

    if (cleanTerms.length === 0) return text;
    try {
      const escaped = cleanTerms
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        cleanTerms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            className="bg-amber-300/40 dark:bg-amber-400/30 text-inherit font-semibold rounded-xs px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const handleCreateCanonicalSubmit = async () => {
    if (!createJsonInput.trim()) return;
    try {
      const parsed = JSON.parse(createJsonInput);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      await createCanonicalQuestions(items, currentActor);
      setIsCreateModalOpen(false);
      setCreateJsonInput('');
    } catch {
      alert('Invalid JSON input. Please verify format.');
    }
  };

  const pendingReviewCount = reviewQueue.filter(
    (t) => t.editorialStatus === 'pending_review'
  ).length;

  const publishedCanonicalCount =
    kpis?.totalPublishedCanonical ||
    catalogQuestions.filter((q) => q.editorialStatus === 'published').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Pills */}
      <GovernanceKpiHeader
        activeBlockPack={activeBlockPack}
        globalActiveBlockId={globalActiveBlockId}
        activeWorkspaceTab={activeWorkspaceTab}
        onSetWorkspaceTab={setWorkspaceTab}
        pendingReviewCount={pendingReviewCount}
        publishedCanonicalCount={publishedCanonicalCount}
        isLoading={isLoading}
        isResettingCache={isResettingCache}
        onResetLocalCache={handleResetLocalCache}
        onReload={() => loadGovernanceData(globalActiveBlockId)}
        resetFeedback={resetFeedback}
        actionFeedback={actionFeedback}
      />

      {/* 2. TAB 1: FACULTY REVIEW QUEUE */}
      {activeWorkspaceTab === 'review-queue' && (
        <GovernanceReviewQueueTab
          filteredQueue={filteredQueue}
          activeTicket={activeTicket}
          selectedTicketId={selectedTicketId}
          onSelectTicket={selectTicket}
          isInlineEditing={isInlineEditing}
          onToggleInlineEditing={() => setIsInlineEditing(!isInlineEditing)}
          inlineStem={inlineStem}
          onUpdateInlineStem={setInlineStem}
          reviewerNotes={reviewerNotes}
          onUpdateReviewerNotes={setReviewerNotes}
          isActionInProgress={isActionInProgress}
          onDecision={handleDecision}
        />
      )}

      {/* 3. TAB 2: CANONICAL QUESTION BANK CURATOR */}
      {activeWorkspaceTab === 'canonical-curator' && (
        <GovernanceCatalogTab
          kpis={kpis}
          catalogQuestions={catalogQuestions}
          filteredCatalog={filteredCatalog}
          pendingReviewCount={pendingReviewCount}
          activeBlockId={activeBlockId}
          showAuditBoard={showAuditBoard}
          onToggleAuditBoard={() => setShowAuditBoard((prev) => !prev)}
          filterCriteria={filterCriteria}
          onSetFilter={setFilter}
          currentSubjects={currentSubjects}
          isAdmin={isAdmin}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenPromptStudio={() => setIsPromptStudioOpen(true)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenEditModal={handleOpenEditModal}
          onOpenDeleteModal={(q) => setDeletingQuestion(q)}
          onToggleArchive={handleArchiveToggle}
          highlightMatch={highlightMatch}
        />
      )}

      {/* CREATE CANONICAL QUESTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Create Canonical Global Question
              </h3>
              <button
                type="button"
                onClick={() => setIsPromptStudioOpen(true)}
                className="py-1 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center space-x-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI Prompt Helper</span>
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Paste a validated question JSON object or array. It will be directly
              committed as canonical and published to all students immediately.
            </p>

            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs text-indigo-950 dark:text-indigo-200 font-medium">
                  Have raw questions? Use our AI Prompt to reformat them instantly
                  in ChatGPT or Claude.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPromptStudioOpen(true)}
                className="py-1 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition-all cursor-pointer"
              >
                Open Studio
              </button>
            </div>

            <textarea
              rows={8}
              placeholder='[ { "id": "q-cvs-ana-101", "stem": "...", "choices": [...] } ]'
              value={createJsonInput}
              onChange={(e) => setCreateJsonInput(e.target.value)}
              className="w-full text-xs font-mono rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCanonicalSubmit}
                disabled={isActionInProgress || !createJsonInput.trim()}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Publish Canonical</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CANONICAL QUESTION MODAL */}
      {editingCanonicalQuestion && (
        <CanonicalQuestionEditModal
          question={editingCanonicalQuestion}
          subjects={currentSubjects}
          onClose={() => setEditingCanonicalQuestion(null)}
          onSave={async (questionId, patch, reason) => {
            const success = await useBankGovernanceStore
              .getState()
              .updateCanonicalQuestion(questionId, patch, reason, currentActor);
            if (success) {
              setEditingCanonicalQuestion(null);
            }
          }}
          onRequestDelete={(q) => {
            setDeletingQuestion(q);
          }}
          isActionInProgress={isActionInProgress}
        />
      )}

      {/* APPLE-GRADE CANONICAL QUESTION DELETION CONFIRMATION MODAL */}
      {deletingQuestion && (
        <CanonicalQuestionDeleteModal
          question={deletingQuestion}
          onClose={() => setDeletingQuestion(null)}
          onConfirmDelete={handleConfirmDelete}
          isActionInProgress={isActionInProgress}
        />
      )}

      {/* EXPORT BANK MODAL */}
      {isExportModalOpen && (
        <AdminExportBankModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* AI PROMPT STUDIO MODAL */}
      {isPromptStudioOpen && (
        <AiPromptStudioModal
          isOpen={isPromptStudioOpen}
          onClose={() => setIsPromptStudioOpen(false)}
        />
      )}
    </div>
  );
};
