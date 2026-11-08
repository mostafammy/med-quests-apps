import React from 'react';
import { Sparkles } from 'lucide-react';
import type {
  AccuracyAuditReport,
  AuditEvaluationDimension,
} from '../../../../../domain/questionBank/accuracyAudit/types.ts';

interface AuditReportMetricsDeckProps {
  readonly currentReport: AccuracyAuditReport;
  readonly dimensionLabels: Record<
    AuditEvaluationDimension,
    { label: string; icon: string }
  >;
}

export const AuditReportMetricsDeck: React.FC<AuditReportMetricsDeckProps> = ({
  currentReport,
  dimensionLabels,
}) => {
  return (
    <div className="space-y-6">
      {/* Session Metadata Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Audited with:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            {currentReport.auditingModel?.modelName || 'Deterministic Engine'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
          <span>
            Strategy:{' '}
            <strong className="text-zinc-800 dark:text-zinc-200 capitalize">
              {currentReport.configuration.strategyType.replace(/_/g, ' ')}
            </strong>
          </span>
          <span>
            Auditor:{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {currentReport.executedByAdmin.displayName}
            </strong>
          </span>
          <span>
            {new Date(currentReport.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* KPI 4-Card Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Accuracy Index Card */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-md">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Overall Accuracy Index
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-heading text-zinc-900 dark:text-zinc-50">
              {currentReport.kpis.overallAccuracyIndex}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Certified
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            95% CI: ±{currentReport.kpis.statisticalMarginOfError.marginOfErrorPercentage}% (
            {currentReport.kpis.statisticalMarginOfError.lowerBoundScore}% –{' '}
            {currentReport.kpis.statisticalMarginOfError.upperBoundScore}%)
          </p>
        </div>

        {/* Verified Questions */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-md">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Flawless Items
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400">
              {currentReport.kpis.verifiedCount}
            </span>
            <span className="text-xs text-zinc-500">
              / {currentReport.kpis.totalSampled} (
              {Math.round(
                (currentReport.kpis.verifiedCount /
                  currentReport.kpis.totalSampled) *
                  100
              )}
              %)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Zero clinical or psychometric flaws detected
          </p>
        </div>

        {/* Warnings */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-md">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Minor Pedagogical Warnings
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-heading text-amber-600 dark:text-amber-400">
              {currentReport.kpis.warningCount}
            </span>
            <span className="text-xs text-zinc-500">items</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Distractor length cues or missing exam tips
          </p>
        </div>

        {/* Critical Errors */}
        <div className="p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-md">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Critical Flaws Requiring Errata
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-heading text-rose-600 dark:text-rose-400">
              {currentReport.kpis.criticalErrorCount}
            </span>
            <span className="text-xs text-zinc-500">items</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            SBA invariant violations or ungrounded claims
          </p>
        </div>
      </div>

      {/* MULTI-AGENT DIMENSION HEALTH BARS */}
      <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-md space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          Clinical Quality Dimensions Across Sample
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {(Object.keys(dimensionLabels) as AuditEvaluationDimension[]).map(
            (dim) => {
              const meta = dimensionLabels[dim];
              const score = currentReport.kpis.dimensionAverages[dim] || 0;
              return (
                <div
                  key={dim}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {score}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        score >= 85
                          ? 'bg-emerald-500'
                          : score >= 70
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};
