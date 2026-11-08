import React from 'react';
import {
  Columns,
  LayoutGrid,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../../domain/questionBank/aiQuestionParser/types.ts';
import { TaxonomyDisplayResolver } from '../../../../../domain/taxonomy/TaxonomyDisplayResolver.ts';

interface PreApprovalQueueHeaderProps {
  readonly totalCount: number;
  readonly selectedCount: number;
  readonly viewMode: 'split' | 'list';
  readonly onSetViewMode: (mode: 'split' | 'list') => void;
  readonly onDiscardBatch: () => void;
  readonly exitState: string;
  readonly effectiveQuestions: readonly ParsedQuestionItem[];
  readonly currentBlockPackName?: string;
  readonly commitFeedback: { type: 'success' | 'error'; message: string } | null;
  readonly subjectMetaMap: Record<string, { icon: string; badgeColor: string }>;
}

export const PreApprovalQueueHeader: React.FC<PreApprovalQueueHeaderProps> = ({
  totalCount,
  selectedCount,
  viewMode,
  onSetViewMode,
  onDiscardBatch,
  exitState,
  effectiveQuestions,
  currentBlockPackName,
  commitFeedback,
  subjectMetaMap,
}) => {
  const uniqueSubjects = Array.from(
    new Set(effectiveQuestions.map((q) => q.question.subjectId))
  );

  return (
    <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold font-heading text-zinc-900 dark:text-zinc-50">
              Pre-Approval Inspection Queue ({totalCount} Items)
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {selectedCount} Selected
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Inspect the structured questions below before committing to the
            Global Question Bank. You can edit stems, choices, keys, or
            curriculum assignments inline.
          </p>
        </div>

        {/* View Switcher: Split Stage vs Stacked List & Clear Batch */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 text-xs">
            <button
              type="button"
              onClick={() => onSetViewMode('split')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split Stage</span>
            </button>
            <button
              type="button"
              onClick={() => onSetViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Stacked List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onDiscardBatch}
            disabled={exitState !== 'idle'}
            title="Discard all parsed questions and smoothly reset workspace"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-zinc-200/70 dark:border-zinc-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Queue</span>
          </button>
        </div>
      </div>

      {/* CURRICULUM AUTO-CLASSIFIER BATCH OVERVIEW DECK */}
      <div className="p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-cyan-500/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                Autonomous Curriculum Auto-Classifier Scope
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                100% Items Classified
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
              <span>
                Target Block:{' '}
                <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                  {effectiveQuestions[0]?.taxonomyClassification?.blockName
                    ? TaxonomyDisplayResolver.humanizeTaxonomySlug(
                        effectiveQuestions[0].taxonomyClassification.blockName
                      )
                    : currentBlockPackName || 'Cardiovascular System (CVS) - Block 206'}
                </strong>
              </span>
              <span>•</span>
              <span>
                {effectiveQuestions.length} Question(s) Grounded to Active Syllabus
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {uniqueSubjects.map((subjId) => {
            const count = effectiveQuestions.filter(
              (q) => q.question.subjectId === subjId
            ).length;
            const meta = TaxonomyDisplayResolver.resolveSubjectMeta(subjId, subjectMetaMap);
            const sampleItem = effectiveQuestions.find((q) => q.question.subjectId === subjId);
            const displayName = TaxonomyDisplayResolver.resolveSubjectName(
              subjId,
              sampleItem?.taxonomyClassification?.subjectName,
              sampleItem?.question.blockId
            );
            return (
              <span
                key={subjId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs"
              >
                <span>{meta.icon}</span>
                <span>
                  {displayName}: {count}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {commitFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
            commitFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
          }`}
        >
          {commitFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span className="font-medium">{commitFeedback.message}</span>
        </div>
      )}
    </div>
  );
};
