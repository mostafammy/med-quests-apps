import React from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit3,
  Sparkles,
} from 'lucide-react';
import type { QuestionReviewSubmission } from '../../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

interface GovernanceReviewQueueTabProps {
  readonly filteredQueue: readonly QuestionReviewSubmission[];
  readonly activeTicket: QuestionReviewSubmission | null;
  readonly selectedTicketId: string | null;
  readonly onSelectTicket: (id: string) => void;
  readonly isInlineEditing: boolean;
  readonly onToggleInlineEditing: () => void;
  readonly inlineStem: string;
  readonly onUpdateInlineStem: (stem: string) => void;
  readonly reviewerNotes: string;
  readonly onUpdateReviewerNotes: (notes: string) => void;
  readonly isActionInProgress: boolean;
  readonly onDecision: (
    decision: 'approve_and_publish' | 'request_changes' | 'reject_submission'
  ) => void;
}

export const GovernanceReviewQueueTab: React.FC<
  GovernanceReviewQueueTabProps
> = ({
  filteredQueue,
  activeTicket,
  onSelectTicket,
  isInlineEditing,
  onToggleInlineEditing,
  inlineStem,
  onUpdateInlineStem,
  reviewerNotes,
  onUpdateReviewerNotes,
  isActionInProgress,
  onDecision,
}) => {
  return (
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
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Queue is Clear
            </p>
            <p className="text-[11px] text-zinc-500">
              All submitted items have been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredQueue.map((ticket) => {
              const isSelected = activeTicket?.ticketId === ticket.ticketId;
              let badge =
                'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/30';
              if (ticket.editorialStatus === 'published') {
                badge =
                  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30';
              } else if (ticket.editorialStatus === 'changes_requested') {
                badge =
                  'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-400/30';
              } else if (ticket.editorialStatus === 'rejected') {
                badge =
                  'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-400/30';
              }

              return (
                <div
                  key={ticket.ticketId}
                  onClick={() => onSelectTicket(ticket.ticketId)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500 shadow-sm'
                      : 'bg-white/70 dark:bg-zinc-900/70 border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-zinc-500">
                      {ticket.question.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge}`}
                    >
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
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {activeTicket.question.id}
                </h3>
                <p className="text-xs text-zinc-500">
                  Author: <strong>{activeTicket.submittedByDisplayName}</strong>{' '}
                  ({activeTicket.submittedByRole})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                  Hash: {activeTicket.question.stemHash?.slice(0, 10)}...
                </span>
                <button
                  onClick={onToggleInlineEditing}
                  className="py-1 px-2.5 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isInlineEditing ? 'Cancel Edit' : 'Refine'}</span>
                </button>
              </div>
            </div>

            {/* Question Stem */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Clinical Vignette
              </label>
              {isInlineEditing ? (
                <textarea
                  rows={4}
                  value={inlineStem}
                  onChange={(e) => onUpdateInlineStem(e.target.value)}
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
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Choices & Rationales
              </label>
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
                  onChange={(e) => onUpdateReviewerNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onDecision('approve_and_publish')}
                  disabled={isActionInProgress}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Publish to Global Bank</span>
                </button>

                <button
                  onClick={() => onDecision('request_changes')}
                  disabled={isActionInProgress}
                  className="py-2.5 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Request Changes</span>
                </button>

                <button
                  onClick={() => onDecision('reject_submission')}
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
            <p className="text-xs text-zinc-500">
              Select a question from the queue on the left to inspect.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
