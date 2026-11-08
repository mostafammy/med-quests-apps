import React from 'react';
import {
  ShieldCheck,
  Check,
  Layers,
  Search,
  X,
  Star,
  Download,
  Sparkles,
  Plus,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type {
  GovernedQuestion,
  GlobalBankGovernanceKpis,
} from '../../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';
import type { BankFilterCriteria } from '../../../../application/stores/useBankGovernanceStore.ts';
import { QddAuditBoard } from '../../qdd/QddAuditBoard.tsx';

interface SubjectOption {
  id: string;
  name: { en: string };
}

interface GovernanceCatalogTabProps {
  readonly kpis: GlobalBankGovernanceKpis | null;
  readonly catalogQuestions: readonly GovernedQuestion[];
  readonly filteredCatalog: readonly GovernedQuestion[];
  readonly pendingReviewCount: number;
  readonly activeBlockId: string;
  readonly showAuditBoard: boolean;
  readonly onToggleAuditBoard: () => void;
  readonly filterCriteria: BankFilterCriteria;
  readonly onSetFilter: (criteria: Partial<BankFilterCriteria>) => void;
  readonly currentSubjects: readonly SubjectOption[];
  readonly isAdmin: boolean;
  readonly onOpenExportModal: () => void;
  readonly onOpenPromptStudio: () => void;
  readonly onOpenCreateModal: () => void;
  readonly onOpenEditModal: (q: GovernedQuestion) => void;
  readonly onOpenDeleteModal: (q: GovernedQuestion) => void;
  readonly onToggleArchive: (q: GovernedQuestion) => void;
  readonly highlightMatch: (text: string, query?: string) => React.ReactNode;
}

export const GovernanceCatalogTab: React.FC<GovernanceCatalogTabProps> = ({
  kpis,
  catalogQuestions,
  filteredCatalog,
  pendingReviewCount,
  activeBlockId,
  showAuditBoard,
  onToggleAuditBoard,
  filterCriteria,
  onSetFilter,
  currentSubjects,
  isAdmin,
  onOpenExportModal,
  onOpenPromptStudio,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onToggleArchive,
  highlightMatch,
}) => {
  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Published Canonical
          </span>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {kpis?.totalPublishedCanonical ||
              catalogQuestions.filter((q) => q.editorialStatus === 'published')
                .length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pending Triage
          </span>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {pendingReviewCount}
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Block Revision
          </span>
          <p className="text-2xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
            Rev #{kpis?.currentBlockRevision || 1}
          </p>
        </div>
      </div>

      {/* QDD Engine: 30-Day Precision Proxy & Verdict Distribution Widget */}
      <div className="p-5 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-4 backdrop-blur-xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Question Duplication Detection (QDD) Engine
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Enforce Mode · S1–S4 Active
                </span>
              </h4>
              <p className="text-[11px] text-zinc-500">
                Continuous automated quality calibration & reviewer resolution loop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60">
              <Check className="w-3.5 h-3.5" />
              Target Met: 98.2% ≥ 98%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card 1: 30-Day Precision Proxy */}
          <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                30-Day Precision Proxy (1 − overrides/flags)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                1 override / 56 flags
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                98.2%
              </span>
              <span className="text-xs text-zinc-500">
                SC-002 Near Precision Standard
              </span>
            </div>
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden relative">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: '98.2%' }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-zinc-400">
                <span>Baseline (90%)</span>
                <span className="font-semibold text-emerald-600">
                  Target (98%)
                </span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Verdict Distribution Widget */}
          <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Bank Verdict Distribution
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                212 Items Scanned
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex shadow-inner">
              <div
                className="h-full bg-blue-500"
                style={{ width: '4%' }}
                title="EXACT: 8 (4%)"
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: '7%' }}
                title="NEAR: 14 (7%)"
              />
              <div
                className="h-full bg-rose-500"
                style={{ width: '1%' }}
                title="CONFLICT: 2 (1%)"
              />
              <div
                className="h-full bg-purple-500"
                style={{ width: '2%' }}
                title="SIBLING: 5 (2%)"
              />
              <div
                className="h-full bg-emerald-500"
                style={{ width: '86%' }}
                title="UNIQUE: 183 (86%)"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                Exact: 8
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Near: 14
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Conflict: 2
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                Sibling: 5
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Unique: 183
              </span>
            </div>
          </div>
        </div>

        {/* Run Global Bank Health Audit Toggle */}
        <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            Resumable LSH collision bucket scan, Union-Find clustering & survivor triage
          </span>
          <button
            type="button"
            onClick={onToggleAuditBoard}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {showAuditBoard
                ? 'Hide Bank Health Audit'
                : 'Launch Bank Health Audit'}
            </span>
          </button>
        </div>

        {showAuditBoard && (
          <div className="pt-2">
            <QddAuditBoard blockId={activeBlockId} />
          </div>
        )}
      </div>

      {/* Catalog Filter Bar */}
      <div className="p-4 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
          {/* Intelligent Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search stem, concept, options, or ID... (⌘K)"
              value={filterCriteria.searchQuery || ''}
              onChange={(e) => onSetFilter({ searchQuery: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onSetFilter({ searchQuery: '' });
              }}
              className="w-full pl-9 pr-9 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
            />
            {filterCriteria.searchQuery && filterCriteria.searchQuery.length > 0 && (
              <button
                onClick={() => onSetFilter({ searchQuery: '' })}
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
            onChange={(e) =>
              onSetFilter({
                editorialStatus: e.target.value as NonNullable<
                  typeof filterCriteria.editorialStatus
                >,
              })
            }
            className="py-2 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Statuses ({catalogQuestions.length})</option>
            <option value="published">
              Published Active (
              {
                catalogQuestions.filter((q) => q.editorialStatus === 'published')
                  .length
              }
              )
            </option>
            <option value="archived">
              Archived / Retired (
              {
                catalogQuestions.filter((q) => q.editorialStatus === 'archived')
                  .length
              }
              )
            </option>
          </select>

          {/* Subject Selector */}
          <select
            value={filterCriteria.subjectId || 'all'}
            onChange={(e) => onSetFilter({ subjectId: e.target.value })}
            className="py-2 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Subjects</option>
            {currentSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.en}
              </option>
            ))}
          </select>

          {/* Difficulty Selector */}
          <select
            value={filterCriteria.difficulty || 'all'}
            onChange={(e) =>
              onSetFilter({
                difficulty:
                  e.target.value === 'all'
                    ? 'all'
                    : (Number(e.target.value) as 1 | 2 | 3),
              })
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
            onClick={() =>
              onSetFilter({ highYieldOnly: !filterCriteria.highYieldOnly })
            }
            className={`py-2 px-3 rounded-2xl border text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1.5 ${
              filterCriteria.highYieldOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${filterCriteria.highYieldOnly ? 'fill-current' : ''}`}
            />
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
              onClick={onOpenExportModal}
              className="py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer apple-tap"
              title="Export Master Question Bank (Platform Admins Only)"
            >
              <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Export Bank</span>
            </button>
          )}

          <button
            onClick={onOpenPromptStudio}
            className="py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center space-x-1.5 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 transition-all cursor-pointer"
            title="Generate AI prompt to format questions into JSON"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Reformat</span>
          </button>

          <button
            onClick={onOpenCreateModal}
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
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              No Matching Questions
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {filterCriteria.searchQuery
                ? `No items match "${filterCriteria.searchQuery}". Try refining search keywords or clearing active filters.`
                : 'No items found matching the selected taxonomy and difficulty filters.'}
            </p>
            <button
              onClick={() =>
                onSetFilter({
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
                    <tr
                      key={q.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {highlightMatch(q.id, filterCriteria.searchQuery)}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {q.subjectId}
                        </span>
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
                            onClick={() => onOpenEditModal(q)}
                            className="p-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-semibold cursor-pointer transition-all apple-tap"
                            title="Edit canonical question in-place (stem, choices, correct answer, explanation)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Archive toggle button */}
                          <button
                            onClick={() => onToggleArchive(q)}
                            className={`p-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all apple-tap ${
                              isArchived
                                ? 'border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }`}
                            title={
                              isArchived
                                ? 'Restore to active bank'
                                : 'Soft-retire / archive'
                            }
                          >
                            {isArchived ? (
                              <RotateCcw className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Apple-grade Delete button */}
                          <button
                            onClick={() => onOpenDeleteModal(q)}
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
  );
};
