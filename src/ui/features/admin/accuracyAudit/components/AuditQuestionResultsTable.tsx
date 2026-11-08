import React from 'react';
import {
  Search,
  Check,
  Copy,
  FileText,
  Download,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type {
  QuestionAccuracyResult,
  AgentCritique,
} from '../../../../../domain/questionBank/accuracyAudit/types.ts';
import type { AuditFilterVerdict } from '../../../../../application/stores/useAdminAccuracyAuditStore.ts';

interface AuditQuestionResultsTableProps {
  readonly filteredQuestions: readonly QuestionAccuracyResult[];
  readonly filterVerdict: AuditFilterVerdict;
  readonly onSetFilterVerdict: (verdict: AuditFilterVerdict) => void;
  readonly searchQuery: string;
  readonly onSetSearchQuery: (query: string) => void;
  readonly selectedQuestionId: string | null;
  readonly onSelectQuestion: (questionId: string | null) => void;
  readonly onExport: (format: 'json' | 'markdown' | 'csv') => void;
  readonly copiedFormat: string | null;
  readonly onRemediate: (questionId: string) => Promise<void>;
}

export const AuditQuestionResultsTable: React.FC<
  AuditQuestionResultsTableProps
> = ({
  filteredQuestions,
  filterVerdict,
  onSetFilterVerdict,
  searchQuery,
  onSetSearchQuery,
  selectedQuestionId,
  onSelectQuestion,
  onExport,
  copiedFormat,
  onRemediate,
}) => {
  return (
    <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4">
      {/* Filter and Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              'all',
              'verified',
              'warning',
              'critical_error',
            ] as AuditFilterVerdict[]
          ).map((tab) => {
            const active = filterVerdict === tab;
            return (
              <button
                key={tab}
                onClick={() => onSetFilterVerdict(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            );
          })}
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search question or concept..."
              value={searchQuery}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onExport('markdown')}
              title="Export Markdown Briefing"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              {copiedFormat === 'markdown' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">MD</span>
            </button>

            <button
              onClick={() => onExport('json')}
              title="Export Raw JSON"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              {copiedFormat === 'json' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">JSON</span>
            </button>

            <button
              onClick={() => onExport('csv')}
              title="Export CSV"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              {copiedFormat === 'csv' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No sampled questions match the current filter criteria.
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const isSelected = selectedQuestionId === q.questionId;
            return (
              <div
                key={q.questionId}
                onClick={() =>
                  onSelectQuestion(isSelected ? null : q.questionId)
                }
                className={`p-4 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-zinc-400">
                        #{idx + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          q.verdict === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : q.verdict === 'warning'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {q.verdict.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {q.concept || q.questionId}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        ({q.subjectId || 'general'} • diff {q.difficulty ?? 2})
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {q.questionStem}
                    </p>

                    {q.criticalFlags.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{q.criticalFlags[0]}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {q.compositeAccuracyScore}%
                      </div>
                      <div className="text-[10px] text-zinc-400">Score</div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-zinc-400 transition-transform ${
                        isSelected ? 'rotate-90 text-indigo-500' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* EXPANDED INSPECTION DRAWER */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 space-y-4 animate-in fade-in duration-200">
                    {/* Multi-Agent Critiques */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Multi-Agent Squad Critiques
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {q.critiques.map((critique: AgentCritique) => (
                          <div
                            key={critique.agentId}
                            className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                {critique.agentName}
                              </span>
                              <span
                                className={`font-mono text-[11px] font-bold ${
                                  critique.evaluation.passed
                                    ? 'text-emerald-500'
                                    : 'text-rose-500'
                                }`}
                              >
                                {critique.evaluation.score}%
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              {critique.evaluation.summary}
                            </p>
                            {critique.evaluation.findings.length > 0 && (
                              <ul className="text-[10px] space-y-0.5 text-amber-600 dark:text-amber-400 list-disc pl-4">
                                {critique.evaluation.findings.map((f: string, i: number) => (
                                  <li key={i}>{f}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remediation & Action Bar */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      {q.suggestedRemediation ? (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Suggested Remediation:
                          </span>{' '}
                          {q.suggestedRemediation.suggestion}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          No remediation required. Item meets Apple standards.
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemediate(q.questionId);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-sm shrink-0"
                      >
                        Flag for Review Queue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
