import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Plus,
  Edit3,
  Archive,
  RotateCcw,
  BookOpen,
  Sparkles,
  Download,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Star,
} from 'lucide-react';
import { useBankGovernanceStore } from '../../../application/stores/useBankGovernanceStore.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { AiPromptStudioModal } from './AiPromptStudioModal.tsx';
import { AdminExportBankModal } from './AdminExportBankModal.tsx';
import type {
  GovernedQuestion,
  QuestionMutationPatch,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export const QuestionBankGovernancePanel: React.FC = () => {
  const {
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
    updateCanonicalQuestion,
    setArchiveStatus,
    deleteCanonicalQuestion,
    getFilteredCatalog,
    getFilteredQueue,
  } = useBankGovernanceStore();

  const { authState, setGovernanceTab } = useAuthStore();
  const { resetLocalBankToGlobal, questions } = useQuestionStore();
  const { t } = useLocaleStore();

  const isAdmin = authState.status === 'authenticated-active' && authState.user.role === 'admin';
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
  const [editingCanonicalQuestion, setEditingCanonicalQuestion] = useState<GovernedQuestion | null>(null);
  const [editConcept, setEditConcept] = useState('');
  const [editStem, setEditStem] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editExamTip, setEditExamTip] = useState('');
  const [editMnemonic, setEditMnemonic] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<1 | 2 | 3>(2);
  const [editCognitiveLevel, setEditCognitiveLevel] = useState<'recall' | 'understanding' | 'application'>('understanding');
  const [editHighYield, setEditHighYield] = useState<boolean>(true);
  const [editSubjectId, setEditSubjectId] = useState<string>('anatomy');
  const [editChapterId, setEditChapterId] = useState<string>('');
  const [editChoices, setEditChoices] = useState<
    Array<{ id: string; text: string; isCorrect: boolean; rationale: string }>
  >([]);
  const [editReason, setEditReason] = useState('Faculty errata refinement & clinical clarification');

  // Modal state for deleting a question (Apple-grade confirmation sheet)
  const [deletingQuestion, setDeletingQuestion] = useState<GovernedQuestion | null>(null);
  const [deleteMode, setDeleteMode] = useState<'permanent' | 'archive'>('permanent');
  const [deleteReason, setDeleteReason] = useState('Faculty curriculum cleanup & item pruning');

  // Modal state for AI Prompt Studio
  const [isPromptStudioOpen, setIsPromptStudioOpen] = useState(false);

  useEffect(() => {
    loadGovernanceData('cvs');
  }, [loadGovernanceData]);

  const filteredCatalog = getFilteredCatalog();
  const filteredQueue = getFilteredQueue();

  const activeTicket = reviewQueue.find((t) => t.ticketId === selectedTicketId) || filteredQueue[0] || null;

  // Sync inline edit state when active ticket changes
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
      const res = await resetLocalBankToGlobal('cvs');
      await loadGovernanceData('cvs');
      setResetFeedback(`Local cache reset: ${res.resetCount} items restored (Rev #${res.revision})`);
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

  const handleDecision = async (decision: 'approve_and_publish' | 'request_changes' | 'reject_submission') => {
    if (!activeTicket) return;

    let inlinePatch: QuestionMutationPatch | undefined = undefined;
    if (isInlineEditing && (inlineStem !== activeTicket.question.stem || inlineExplanation !== activeTicket.question.explanation)) {
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
      isArchived ? 'Reason for restoring question:' : 'Reason for soft-retiring / archiving question:',
      isArchived ? 'Restored by curriculum committee' : 'Outdated diagnostic guidelines'
    );
    if (!reason) return;

    await setArchiveStatus(question.id, !isArchived, reason, currentActor);
  };

  const handleOpenEditModal = (q: GovernedQuestion) => {
    setEditingCanonicalQuestion(q);
    setEditConcept(q.concept || '');
    setEditStem(q.stem || '');
    setEditExplanation(q.explanation || '');
    setEditExamTip(q.examTip || '');
    setEditMnemonic(q.mnemonic || '');
    setEditDifficulty(q.difficulty || 2);
    setEditCognitiveLevel(q.cognitiveLevel || 'understanding');
    setEditHighYield(q.highYield !== false);
    setEditSubjectId(q.subjectId || 'anatomy');
    setEditChapterId(q.chapterId || '');
    setEditChoices(
      q.choices && q.choices.length > 0
        ? q.choices.map((c) => ({
            id: c.id,
            text: c.text,
            isCorrect: c.isCorrect,
            rationale: c.rationale || '',
          }))
        : [
            { id: 'a', text: '', isCorrect: true, rationale: '' },
            { id: 'b', text: '', isCorrect: false, rationale: '' },
            { id: 'c', text: '', isCorrect: false, rationale: '' },
            { id: 'd', text: '', isCorrect: false, rationale: '' },
          ]
    );
    setEditReason('Faculty errata refinement & clinical clarification');
  };

  const handleSetCorrectChoice = (choiceId: string) => {
    setEditChoices((prev) =>
      prev.map((c) => ({
        ...c,
        isCorrect: c.id === choiceId,
      }))
    );
  };

  const handleUpdateChoiceText = (choiceId: string, text: string) => {
    setEditChoices((prev) =>
      prev.map((c) => (c.id === choiceId ? { ...c, text } : c))
    );
  };

  const handleUpdateChoiceRationale = (choiceId: string, rationale: string) => {
    setEditChoices((prev) =>
      prev.map((c) => (c.id === choiceId ? { ...c, rationale } : c))
    );
  };

  const handleAddChoice = () => {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const nextId =
      letters.find((l) => !editChoices.some((c) => c.id.toLowerCase() === l)) ||
      `opt_${editChoices.length + 1}`;
    setEditChoices((prev) => [
      ...prev,
      { id: nextId, text: '', isCorrect: false, rationale: '' },
    ]);
  };

  const handleRemoveChoice = (choiceId: string) => {
    if (editChoices.length <= 2) return;
    const filtered = editChoices.filter((c) => c.id !== choiceId);
    if (!filtered.some((c) => c.isCorrect) && filtered.length > 0) {
      filtered[0].isCorrect = true;
    }
    setEditChoices(filtered);
  };

  const handleConfirmDelete = async () => {
    if (!deletingQuestion) return;
    const isPermanent = deleteMode === 'permanent';
    const success = await deleteCanonicalQuestion(
      deletingQuestion.id,
      deleteReason || (isPermanent ? 'Permanent deletion from canonical bank' : 'Archived question'),
      currentActor,
      isPermanent
    );
    if (success) {
      setActionFeedback(
        isPermanent
          ? `Question ${deletingQuestion.id} has been permanently deleted from the global bank.`
          : `Question ${deletingQuestion.id} has been archived.`
      );
      setTimeout(() => setActionFeedback(null), 5000);
      if (editingCanonicalQuestion?.id === deletingQuestion.id) {
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
      const escaped = cleanTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        cleanTerms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-amber-300/40 dark:bg-amber-400/30 text-inherit font-semibold rounded-xs px-0.5">
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

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 backdrop-blur-xl">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setWorkspaceTab('review-queue')}
            className={`py-2 px-4 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeWorkspaceTab === 'review-queue'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Curriculum Review Queue</span>
            {reviewQueue.filter((t) => t.editorialStatus === 'pending_review').length > 0 && (
              <span className="ml-1.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950">
                {reviewQueue.filter((t) => t.editorialStatus === 'pending_review').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setWorkspaceTab('canonical-curator')}
            className={`py-2 px-4 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeWorkspaceTab === 'canonical-curator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Global Bank Curator ({catalogQuestions.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5 transition-all cursor-pointer apple-tap"
              title="Export Master Question Bank (Platform Admins Only)"
            >
              <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Export Master Bank ({catalogQuestions.length || questions.length})</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setGovernanceTab('accuracy-audit')}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 hover:from-pink-500/20 hover:to-indigo-500/20 border border-purple-200/80 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer apple-tap"
              title="Launch Random Sample Accuracy Audit Lab"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Accuracy Audit Lab</span>
            </button>
          )}

          <button
            onClick={() => setIsPromptStudioOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer apple-tap"
            title="Open AI Prompt Studio to format questions for LLMs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI Prompt Studio</span>
          </button>

          <button
            onClick={handleResetLocalCache}
            disabled={isResettingCache}
            title={t.studio.resetToGlobalBtn}
            className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-300 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-1.5 transition-all cursor-pointer apple-tap"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResettingCache ? 'animate-spin text-rose-600' : ''}`} />
            <span>{isResettingCache ? 'Resetting...' : 'Reset Local Bank'}</span>
          </button>

          <button
            onClick={() => loadGovernanceData('cvs')}
            disabled={isLoading}
            className="py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh Cockpit</span>
          </button>
        </div>
      </div>

      {resetFeedback && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-800 dark:text-indigo-300 text-xs flex items-center justify-between animate-apple-entrance">
          <div className="flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>{resetFeedback}</span>
          </div>
        </div>
      )}

      {actionFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-apple-entrance">
          <div className="flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:opacity-75 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. TAB 1: CURRICULUM REVIEW QUEUE */}
      {activeWorkspaceTab === 'review-queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submissions List (Left Col) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <span>Submitted Items ({filteredQueue.length})</span>
              <span className="text-[11px] text-zinc-500">Select to inspect</span>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Queue is Clear</p>
                <p className="text-[11px] text-zinc-500">All submitted items have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                {filteredQueue.map((ticket) => {
                  const isSelected = activeTicket?.ticketId === ticket.ticketId;
                  let badge = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/30';
                  if (ticket.editorialStatus === 'published') {
                    badge = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30';
                  } else if (ticket.editorialStatus === 'changes_requested') {
                    badge = 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-400/30';
                  } else if (ticket.editorialStatus === 'rejected') {
                    badge = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-400/30';
                  }

                  return (
                    <div
                      key={ticket.ticketId}
                      onClick={() => selectTicket(ticket.ticketId)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500 shadow-sm'
                          : 'bg-white/70 dark:bg-zinc-900/70 border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-zinc-500">{ticket.question.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge}`}>
                          {ticket.editorialStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                        {ticket.question.stem}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <span>By: {ticket.submittedByDisplayName}</span>
                        <span className="capitalize">{ticket.question.subjectId}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Split-Pane Clinical Inspector (Right Col) */}
          <div className="lg:col-span-7">
            {activeTicket ? (
              <div className="p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-lg space-y-6">
                {/* Item Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Vignette Review Ticket
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{activeTicket.question.id}</h3>
                    <p className="text-xs text-zinc-500">
                      Author: <strong>{activeTicket.submittedByDisplayName}</strong> ({activeTicket.submittedByRole})
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                      Hash: {activeTicket.question.stemHash?.slice(0, 10)}...
                    </span>
                    <button
                      onClick={() => setIsInlineEditing(!isInlineEditing)}
                      className="py-1 px-2.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isInlineEditing ? 'Cancel Edit' : 'Refine'}</span>
                    </button>
                  </div>
                </div>

                {/* Question Stem (Editable if isInlineEditing) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Clinical Vignette</label>
                  {isInlineEditing ? (
                    <textarea
                      rows={4}
                      value={inlineStem}
                      onChange={(e) => setInlineStem(e.target.value)}
                      className="w-full text-xs font-serif rounded-2xl border border-indigo-400 p-3 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                    />
                  ) : (
                    <p className="text-sm font-serif leading-relaxed text-zinc-900 dark:text-zinc-100 bg-zinc-50/70 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
                      {inlineStem}
                    </p>
                  )}
                </div>

                {/* Choices & Distractor Rationales */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Choices & Rationales</label>
                  <div className="space-y-2">
                    {activeTicket.question.choices.map((choice) => (
                      <div
                        key={choice.id}
                        className={`p-3 rounded-2xl border text-xs space-y-1 ${
                          choice.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-400 text-emerald-950 dark:text-emerald-200'
                            : 'bg-zinc-50/70 dark:bg-zinc-950/40 border-zinc-200/60 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-bold">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono bg-white dark:bg-zinc-800 border border-current">
                            {choice.id.toUpperCase()}
                          </span>
                          <span>{choice.text}</span>
                          {choice.isCorrect && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                              Correct Choice
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-7">
                          <strong>Rationale:</strong> {choice.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authoritative Evidence Grounding */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Curriculum Evidence Grounding</span>
                  </label>
                  <div className="space-y-2">
                    {activeTicket.question.evidence?.map((ev, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-xs space-y-1 text-indigo-950 dark:text-indigo-200"
                      >
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span>Source: {ev.sourceName}</span>
                          <span className="font-mono">{ev.location}</span>
                        </div>
                        <p className="font-serif italic text-[12px] pl-2 border-l-2 border-indigo-400">
                          "{ev.quote}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviewer Action Bar */}
                <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                      Faculty Reviewer Feedback / Editorial Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Excellent distractor plausibility. Verified against heart development lecture."
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleDecision('approve_and_publish')}
                      disabled={isActionInProgress}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Publish to Global Bank</span>
                    </button>

                    <button
                      onClick={() => handleDecision('request_changes')}
                      disabled={isActionInProgress}
                      className="py-2.5 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Changes</span>
                    </button>

                    <button
                      onClick={() => handleDecision('reject_submission')}
                      disabled={isActionInProgress}
                      className="py-2.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-center">
                <p className="text-xs text-zinc-500">Select a question from the queue on the left to inspect.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB 2: CANONICAL QUESTION BANK CURATOR */}
      {activeWorkspaceTab === 'canonical-curator' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Published Canonical</span>
              <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {kpis?.totalPublishedCanonical || catalogQuestions.filter((q) => q.editorialStatus === 'published').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Pending Triage
              </span>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {reviewQueue.filter((t) => t.editorialStatus === 'pending_review').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                High-Yield Ratio
              </span>
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {kpis?.highYieldPercentage || 85}%
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Block Revision</span>
              <p className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
                Rev #{kpis?.currentBlockRevision || 1}
              </p>
            </div>
          </div>

          {/* Catalog Filter Bar */}
          <div className="p-4 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              {/* Apple-style Intelligent Search Input */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search stem, concept, options, or ID... (⌘K)"
                  value={filterCriteria.searchQuery || ''}
                  onChange={(e) => setFilter({ searchQuery: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setFilter({ searchQuery: '' });
                  }}
                  className="w-full pl-9 pr-9 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
                />
                {filterCriteria.searchQuery && filterCriteria.searchQuery.length > 0 && (
                  <button
                    onClick={() => setFilter({ searchQuery: '' })}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Selector */}
              <select
                value={filterCriteria.editorialStatus || 'all'}
                onChange={(e) => setFilter({ editorialStatus: e.target.value as any })}
                className="py-2 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Statuses ({catalogQuestions.length})</option>
                <option value="published">
                  Published Active ({catalogQuestions.filter((q) => q.editorialStatus === 'published').length})
                </option>
                <option value="archived">
                  Archived / Retired ({catalogQuestions.filter((q) => q.editorialStatus === 'archived').length})
                </option>
              </select>

              {/* Subject Selector */}
              <select
                value={filterCriteria.subjectId || 'all'}
                onChange={(e) => setFilter({ subjectId: e.target.value })}
                className="py-2 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {CVS_TAXONOMY.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Difficulty Selector */}
              <select
                value={filterCriteria.difficulty || 'all'}
                onChange={(e) =>
                  setFilter({ difficulty: e.target.value === 'all' ? 'all' : (Number(e.target.value) as any) })
                }
                className="py-2 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Difficulties</option>
                <option value="1">Level 1 (Foundational)</option>
                <option value="2">Level 2 (Intermediate)</option>
                <option value="3">Level 3 (Hard)</option>
              </select>

              {/* High-Yield Filter Button */}
              <button
                onClick={() => setFilter({ highYieldOnly: !filterCriteria.highYieldOnly })}
                className={`py-2 px-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 ${
                  filterCriteria.highYieldOnly
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${filterCriteria.highYieldOnly ? 'fill-current' : ''}`} />
                <span>High-Yield</span>
              </button>

              {filterCriteria.searchQuery && (
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-400/20">
                  {filteredCatalog.length} matched
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isAdmin && (
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer apple-tap"
                  title="Export Master Question Bank (Platform Admins Only)"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Export Bank</span>
                </button>
              )}

              <button
                onClick={() => setIsPromptStudioOpen(true)}
                className="py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center space-x-1.5 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
                title="Generate AI prompt to format questions into JSON"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Reformat</span>
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer apple-tap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Question</span>
              </button>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden bg-white/70 dark:bg-zinc-900/70 shadow-sm backdrop-blur-xl">
            {filteredCatalog.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Search className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Matching Questions</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {filterCriteria.searchQuery
                    ? `No items match "${filterCriteria.searchQuery}". Try refining search keywords or clearing active filters.`
                    : 'No items found matching the selected taxonomy and difficulty filters.'}
                </p>
                <button
                  onClick={() =>
                    setFilter({
                      searchQuery: '',
                      subjectId: 'all',
                      difficulty: 'all',
                      editorialStatus: 'all',
                      highYieldOnly: false,
                    })
                  }
                  className="py-1.5 px-3.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer apple-tap"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/80 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Item ID</th>
                      <th className="py-3 px-4">Subject / Chapter</th>
                      <th className="py-3 px-4">Concept & Stem Preview</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Version</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                    {filteredCatalog.map((q) => {
                      const isArchived = q.editorialStatus === 'archived';
                      return (
                        <tr key={q.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                            {highlightMatch(q.id, filterCriteria.searchQuery)}
                          </td>
                          <td className="py-3.5 px-4 capitalize text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{q.subjectId}</span>
                            <span className="text-[10px] text-zinc-400 block truncate max-w-[140px]">
                              {q.chapterId}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-md">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                              {highlightMatch(q.concept, filterCriteria.searchQuery)}
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 font-serif leading-relaxed">
                              {highlightMatch(q.stem, filterCriteria.searchQuery)}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                q.difficulty === 1
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : q.difficulty === 2
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              Level {q.difficulty}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                            v{q.bankVersion}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isArchived
                                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {isArchived ? 'Archived' : 'Published'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Edit in-place button */}
                              <button
                                onClick={() => handleOpenEditModal(q)}
                                className="p-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-semibold cursor-pointer transition-all apple-tap"
                                title="Edit canonical question in-place (stem, choices, correct answer, explanation)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Archive toggle button */}
                              <button
                                onClick={() => handleArchiveToggle(q)}
                                className={`p-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all apple-tap ${
                                  isArchived
                                    ? 'border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                                }`}
                                title={isArchived ? 'Restore to active bank' : 'Soft-retire / archive'}
                              >
                                {isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                              </button>

                              {/* Apple-grade Delete button */}
                              <button
                                onClick={() => {
                                  setDeletingQuestion(q);
                                  setDeleteMode('permanent');
                                  setDeleteReason('Faculty curriculum cleanup & item pruning');
                                }}
                                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer transition-all apple-tap"
                                title="Delete question permanently or archive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE CANONICAL QUESTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Create Canonical Global Question</h3>
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
              Paste a validated question JSON object or array. It will be directly committed as canonical and published to all students immediately.
            </p>

            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs text-indigo-950 dark:text-indigo-200 font-medium">
                  Have raw questions? Use our AI Prompt to reformat them instantly in ChatGPT or Claude.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPromptStudioOpen(true)}
                className="shrink-0 ml-2 py-1 px-2.5 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
              >
                Open Studio
              </button>
            </div>

            <textarea
              rows={8}
              value={createJsonInput}
              onChange={(e) => setCreateJsonInput(e.target.value)}
              placeholder='[ { "id": "q-cvs-ana-0099", "stem": "...", "choices": [...] } ]'
              className="w-full text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(createJsonInput);
                    const list = Array.isArray(parsed) ? parsed : [parsed];
                    await createCanonicalQuestions(list, currentActor);
                    setIsCreateModalOpen(false);
                    setCreateJsonInput('');
                  } catch (e: any) {
                    alert(`Invalid JSON: ${e.message}`);
                  }
                }}
                className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Commit & Distribute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL RICH EDIT CANONICAL QUESTION MODAL */}
      {editingCanonicalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-apple-entrance">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Editing Canonical Item • {editingCanonicalQuestion.id} (v{editingCanonicalQuestion.bankVersion})
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Update Global Canonical Question
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCanonicalQuestion(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Concept Title */}
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Concept Title</label>
                <input
                  type="text"
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  placeholder="e.g. Superior Mediastinum Plane (Angle of Louis)"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Taxonomy & Metadata Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Subject</label>
                  <select
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden capitalize"
                  >
                    {CVS_TAXONOMY.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Difficulty Level</label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value={1}>Level 1 (Foundational)</option>
                    <option value={2}>Level 2 (Intermediate)</option>
                    <option value={3}>Level 3 (Hard / Complex)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Cognitive Level</label>
                  <select
                    value={editCognitiveLevel}
                    onChange={(e) =>
                      setEditCognitiveLevel(e.target.value as 'recall' | 'understanding' | 'application')
                    }
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden capitalize"
                  >
                    <option value="recall">Recall</option>
                    <option value="understanding">Understanding</option>
                    <option value="application">Application</option>
                  </select>
                </div>
              </div>

              {/* High-Yield Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-400/20">
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-current" />
                  <span className="font-bold text-amber-950 dark:text-amber-200">High-Yield Board Question</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHighYield}
                    onChange={(e) => setEditHighYield(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Clinical Vignette Stem */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Clinical Vignette Stem</label>
                  <span className="text-[11px] text-zinc-400">
                    {editStem.length} chars • {editStem.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editStem}
                  onChange={(e) => setEditStem(e.target.value)}
                  placeholder="Clinical scenario or question stem..."
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Choices & Correct Answer Editor */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center space-x-1.5">
                      <span>Choices & Correct Answer</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                        {editChoices.length} Options
                      </span>
                    </label>
                    <p className="text-[11px] text-zinc-500">
                      Designate the single correct answer and provide distinct distractor rationales.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddChoice}
                    disabled={editChoices.length >= 6}
                    className="py-1 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center space-x-1 hover:bg-indigo-100/80 cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Option</span>
                  </button>
                </div>

                {/* Validation Banner if incorrect number of correct choices */}
                {editChoices.filter((c) => c.isCorrect).length !== 1 && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-900 dark:text-amber-200 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Please designate exactly <strong>one</strong> correct answer. Currently selected:{' '}
                      {editChoices.filter((c) => c.isCorrect).length}.
                    </span>
                  </div>
                )}

                {/* Choices List */}
                <div className="space-y-2.5">
                  {editChoices.map((choice) => (
                    <div
                      key={choice.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                        choice.isCorrect
                          ? 'bg-emerald-500/10 border-emerald-400/60 dark:border-emerald-600 shadow-xs'
                          : 'bg-zinc-50/60 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs uppercase ${
                              choice.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {choice.id}
                          </span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">Option {choice.id.toUpperCase()}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {choice.isCorrect ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white flex items-center space-x-1 shadow-xs">
                              <Check className="w-3 h-3" />
                              <span>Correct Answer</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCorrectChoice(choice.id)}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              Mark as Correct
                            </button>
                          )}

                          {editChoices.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChoice(choice.id)}
                              className="text-zinc-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete this option"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Choice Text */}
                      <input
                        type="text"
                        placeholder="Option text..."
                        value={choice.text}
                        onChange={(e) => handleUpdateChoiceText(choice.id, e.target.value)}
                        className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />

                      {/* Choice Rationale */}
                      <input
                        type="text"
                        placeholder="Clinical rationale (why this choice is correct or incorrect)..."
                        value={choice.rationale}
                        onChange={(e) => handleUpdateChoiceRationale(choice.id, e.target.value)}
                        className="w-full text-[11px] rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 p-2 bg-white/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Explanation */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Clinical Explanation</label>
                <textarea
                  rows={3}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  placeholder="Authoritative anatomical & clinical reasoning..."
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Exam Tip & Mnemonic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Exam Tip <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={editExamTip}
                    onChange={(e) => setEditExamTip(e.target.value)}
                    placeholder="e.g. Count ribs starting from the 2nd costal cartilage"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Mnemonic <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={editMnemonic}
                    onChange={(e) => setEditMnemonic(e.target.value)}
                    placeholder="e.g. RAT PLAC"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Audit Change Reason */}
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Audit Change Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Required for institutional accreditation audit log..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Modal Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setDeletingQuestion(editingCanonicalQuestion);
                  setDeleteMode('permanent');
                  setDeleteReason('Faculty curriculum cleanup & item pruning');
                }}
                className="py-2.5 px-3.5 rounded-xl border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-1.5 transition-all cursor-pointer apple-tap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Question...</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCanonicalQuestion(null)}
                  className="py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const hasSingleCorrect = editChoices.filter((c) => c.isCorrect).length === 1;
                    if (!hasSingleCorrect) {
                      alert('Please designate exactly one correct answer before publishing.');
                      return;
                    }
                    if (editChoices.some((c) => !c.text.trim())) {
                      alert('All choices must have valid option text.');
                      return;
                    }
                    await updateCanonicalQuestion(
                      editingCanonicalQuestion.id,
                      {
                        concept: editConcept.trim(),
                        stem: editStem.trim(),
                        explanation: editExplanation.trim(),
                        examTip: editExamTip.trim() || null,
                        mnemonic: editMnemonic.trim() || null,
                        difficulty: editDifficulty,
                        cognitiveLevel: editCognitiveLevel,
                        highYield: editHighYield,
                        subjectId: editSubjectId as any,
                        chapterId: editChapterId as any,
                        choices: editChoices.map((c) => ({
                          id: c.id as 'a' | 'b' | 'c' | 'd',
                          text: c.text.trim(),
                          isCorrect: c.isCorrect,
                          rationale: c.rationale.trim(),
                        })),
                      },
                      editReason || 'Faculty errata update',
                      currentActor
                    );
                    setActionFeedback(`Question ${editingCanonicalQuestion.id} updated and revision published.`);
                    setTimeout(() => setActionFeedback(null), 5000);
                    setEditingCanonicalQuestion(null);
                  }}
                  disabled={
                    isActionInProgress ||
                    editChoices.filter((c) => c.isCorrect).length !== 1 ||
                    !editStem.trim() ||
                    !editConcept.trim()
                  }
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
                >
                  {isActionInProgress ? 'Publishing Revision...' : 'Publish Global Revision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPLE-GRADE CANONICAL QUESTION DELETE CONFIRMATION MODAL */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-apple-entrance">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-400/20 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600">
                  Curriculum Governance
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Canonical Question
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/70 space-y-1">
              <span className="font-mono text-[10px] font-bold text-zinc-500">{deletingQuestion.id}</span>
              <p className="text-xs font-serif text-zinc-800 dark:text-zinc-200 line-clamp-2">
                "{deletingQuestion.stem}"
              </p>
            </div>

            {/* Deletion Mode Radio */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block">Deletion Strategy</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  onClick={() => setDeleteMode('permanent')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    deleteMode === 'permanent'
                      ? 'border-rose-500 bg-rose-500/10 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <span className="font-bold block text-xs">Permanent Purge</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                    Completely removes question from the master bank & tests.
                  </span>
                </div>

                <div
                  onClick={() => setDeleteMode('archive')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    deleteMode === 'archive'
                      ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <span className="font-bold block text-xs">Archive / Soft-Retire</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                    Quarantines from tests while keeping historical audit trail.
                  </span>
                </div>
              </div>
            </div>

            {/* Reason Input */}
            <div>
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1 text-xs">
                Audit Reason <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason for deletion (recorded in curriculum audit log)..."
                className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-900 dark:text-amber-200 text-[11px]">
              <strong>Note:</strong> Deleting will automatically increment the canonical block revision and propagate to
              all connected student sessions.
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isActionInProgress || !deleteReason.trim()}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isActionInProgress ? 'Processing...' : 'Confirm Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI PROMPT STUDIO & REFORMATTING MODAL */}
      <AiPromptStudioModal
        isOpen={isPromptStudioOpen}
        onClose={() => setIsPromptStudioOpen(false)}
        onInsertExample={(exampleJson) => {
          setCreateJsonInput(exampleJson);
          setIsCreateModalOpen(true);
        }}
      />

      {/* AUTHORITATIVE MASTER BANK EXPORT MODAL (Admins Only) */}
      {isAdmin && (
        <AdminExportBankModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          blockId="cvs"
        />
      )}
    </div>
  );
};
