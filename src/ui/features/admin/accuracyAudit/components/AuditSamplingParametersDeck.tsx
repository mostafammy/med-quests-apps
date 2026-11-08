import React from 'react';
import { Sliders, Sparkles, Play, Square, RefreshCw } from 'lucide-react';
import type { CloudProviderId } from '../../../../../domain/ai/settings.ts';
import type {
  SamplingStrategyType,
  ConfidenceLevel,
  SamplingConfiguration,
  AuditProgressTelemetry,
} from '../../../../../domain/questionBank/accuracyAudit/types.ts';

export interface AuditModelOption {
  providerId: CloudProviderId;
  modelId: string;
  name: string;
  badge: string;
}

interface BlockSummary {
  code?: string;
  name?: string | { en: string; ar?: string };
  [key: string]: unknown;
}

interface AuditSamplingParametersDeckProps {
  readonly block?: BlockSummary | null;
  readonly activeBlockId: string;
  readonly selectedProvider: CloudProviderId;
  readonly selectedModelId: string;
  readonly onSelectModel: (provider: CloudProviderId, modelId: string) => void;
  readonly modelOptions: readonly AuditModelOption[];
  readonly samplingConfig: SamplingConfiguration;
  readonly onUpdateSamplingConfig: (
    patch: Partial<SamplingConfiguration>
  ) => void;
  readonly isAuditing: boolean;
  readonly progress:
    | AuditProgressTelemetry
    | { current: number; total: number; currentStep: string }
    | null;
  readonly onStartAudit: () => void;
  readonly onAbortAudit: () => void;
  readonly error: string | null;
}

export const AuditSamplingParametersDeck: React.FC<
  AuditSamplingParametersDeckProps
> = ({
  block,
  activeBlockId,
  selectedProvider,
  selectedModelId,
  onSelectModel,
  modelOptions,
  samplingConfig,
  onUpdateSamplingConfig,
  isAuditing,
  progress,
  onStartAudit,
  onAbortAudit,
  error,
}) => {
  const selectedModel =
    modelOptions.find(
      (m) =>
        m.providerId === selectedProvider && m.modelId === selectedModelId
    ) || modelOptions[0];

  return (
    <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Audit Sampling Parameters
          </h2>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            data-testid="accuracy-audit-active-block-pill"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>{block?.code ?? (activeBlockId || 'cvs').toUpperCase()}</span>
            <span className="text-zinc-400">•</span>
            <span>
              {typeof block?.name === 'string'
                ? block.name
                : (block?.name as { en?: string })?.en ?? activeBlockId}
            </span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">
              (Controlled via Navbar)
            </span>
          </div>

          <span className="text-[11px] text-zinc-500 hidden md:inline">
            Finite Population Correction (FPC) Applied
          </span>
        </div>
      </div>

      {/* Model Selection & Sampling Strategy */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* AI Model Selector */}
        <div className="space-y-1.5 md:col-span-7">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Auditing AI Model Selector
            </label>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedModel.badge}
            </span>
          </div>
          <select
            value={`${selectedProvider}::${selectedModelId}`}
            onChange={(e) => {
              const [p, m] = e.target.value.split('::') as [
                CloudProviderId,
                string,
              ];
              onSelectModel(p, m);
            }}
            disabled={isAuditing}
            className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          >
            {modelOptions.map((opt) => (
              <option
                key={`${opt.providerId}::${opt.modelId}`}
                value={`${opt.providerId}::${opt.modelId}`}
              >
                {opt.name} — {opt.badge}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy Picker */}
        <div className="space-y-1.5 md:col-span-5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Sampling Strategy
          </label>
          <select
            value={samplingConfig.strategyType}
            onChange={(e) =>
              onUpdateSamplingConfig({
                strategyType: e.target.value as SamplingStrategyType,
              })
            }
            disabled={isAuditing}
            className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          >
            <option value="stratified_subject">
              Stratified Random (Proportional by Subject)
            </option>
            <option value="simple_random">Simple Random Sampling (SRS)</option>
            <option value="high_yield_cluster">
              Cluster: High-Yield Board Topics Only
            </option>
            <option value="comprehensive_exhaustive">
              Exhaustive (100% Full Bank Scan)
            </option>
          </select>
        </div>
      </div>

      {/* Row 2: Statistical Controls & Confidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Confidence Level (Z-score)
          </label>
          <select
            value={samplingConfig.confidenceLevel}
            onChange={(e) =>
              onUpdateSamplingConfig({
                confidenceLevel: e.target.value as ConfidenceLevel,
              })
            }
            disabled={isAuditing}
            className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 font-medium"
          >
            <option value="90%">90% Confidence (Z = 1.645)</option>
            <option value="95%">95% Confidence (Z = 1.960 — Standard)</option>
            <option value="99%">99% Confidence (Z = 2.576 — Rigorous)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <span>Margin of Error (d)</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono">
              ±{samplingConfig.marginOfErrorPercentage}%
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="10"
            step="1"
            value={samplingConfig.marginOfErrorPercentage}
            onChange={(e) =>
              onUpdateSamplingConfig({
                marginOfErrorPercentage: Number(e.target.value),
              })
            }
            disabled={isAuditing}
            className="w-full accent-indigo-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Reproducible Seed
          </label>
          <input
            type="number"
            value={samplingConfig.randomSeed}
            onChange={(e) =>
              onUpdateSamplingConfig({ randomSeed: Number(e.target.value) })
            }
            disabled={isAuditing}
            className="w-full text-xs font-mono rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="flex items-end">
          {isAuditing ? (
            <button
              onClick={onAbortAudit}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/25"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Cancel Execution
            </button>
          ) : (
            <button
              onClick={onStartAudit}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/25"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch Accuracy Audit
            </button>
          )}
        </div>
      </div>

      {/* Progress / Status Bar */}
      {isAuditing && progress && (() => {
        const currentStep = 'message' in progress ? progress.message : progress.currentStep;
        const currentCount = 'currentQuestionIndex' in progress ? progress.currentQuestionIndex : progress.current;
        const totalCount = 'totalQuestionsToAudit' in progress ? progress.totalQuestionsToAudit : progress.total;
        const percent = 'percentComplete' in progress
          ? progress.percentComplete
          : totalCount > 0
          ? Math.round((currentCount / totalCount) * 100)
          : 0;

        return (
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                {currentStep}
              </span>
              <span className="font-mono text-zinc-500">
                {currentCount} / {totalCount} ({percent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 rounded-full"
                style={{
                  width: `${percent}%`,
                }}
              />
            </div>
          </div>
        );
      })()}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
};
