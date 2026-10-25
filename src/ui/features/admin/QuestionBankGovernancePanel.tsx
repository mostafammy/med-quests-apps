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
} from 'lucide-react';
import { useBankGovernanceStore } from '../../../application/stores/useBankGovernanceStore.ts';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
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
    setArchiveStatus,
    getFilteredCatalog,
    getFilteredQueue,
  } = useBankGovernanceStore();

  const { authState } = useAuthStore();

  // Local state for reviewer actions
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineStem, setInlineStem] = useState('');
  const [inlineExplanation, setInlineExplanation] = useState('');

  // Modal state for creating canonical items
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createJsonInput, setCreateJsonInput] = useState('');

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

        <button
          onClick={() => loadGovernanceData('cvs')}
          disabled={isLoading}
          className="py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center space-x-1.5 self-start sm:self-auto hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh Cockpit</span>
        </button>
      </div>

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
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search stem, concept..."
                  value={filterCriteria.searchQuery || ''}
                  onChange={(e) => setFilter({ searchQuery: e.target.value })}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-hidden"
                />
              </div>

              <select
                value={filterCriteria.subjectId || 'all'}
                onChange={(e) => setFilter({ subjectId: e.target.value })}
                className="py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-hidden"
              >
                <option value="all">All Subjects</option>
                {CVS_TAXONOMY.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCriteria.difficulty || 'all'}
                onChange={(e) => setFilter({ difficulty: e.target.value === 'all' ? 'all' : (Number(e.target.value) as any) })}
                className="py-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-hidden"
              >
                <option value="all">All Difficulties</option>
                <option value="1">Foundational (1)</option>
                <option value="2">Intermediate (2)</option>
                <option value="3">Hard (3)</option>
              </select>

              <button
                onClick={() => setFilter({ highYieldOnly: !filterCriteria.highYieldOnly })}
                className={`py-1.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  filterCriteria.highYieldOnly
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                High-Yield Only
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="py-1.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer apple-tap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Canonical Question</span>
              </button>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden bg-white/70 dark:bg-zinc-900/70">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item ID</th>
                    <th className="py-3 px-4">Subject / Topic</th>
                    <th className="py-3 px-4">Concept</th>
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
                      <tr key={q.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-800 dark:text-zinc-200">{q.id}</td>
                        <td className="py-3 px-4 capitalize text-zinc-600 dark:text-zinc-400">
                          {q.subjectId} <span className="text-[10px] text-zinc-400 block">{q.chapterId}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                          {q.concept}
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">v{q.bankVersion}</td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleArchiveToggle(q)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                isArchived
                                  ? 'border-emerald-400 text-emerald-600 hover:bg-emerald-50'
                                  : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                              }`}
                              title={isArchived ? 'Restore to active bank' : 'Soft-retire / archive'}
                            >
                              {isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CANONICAL QUESTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-xl w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Create Canonical Global Question</h3>
            <p className="text-xs text-zinc-500">
              Paste a validated question JSON object or array. It will be directly committed as canonical and published to all students immediately.
            </p>
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
    </div>
  );
};
