import React, { useEffect, useState } from 'react';
import {
  Zap,
  ShieldCheck,
  Clock,
  Cpu,
  Globe,
  Sparkles,
  RotateCw,
  Trash2,
  X,
  Gauge,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  type OverallAiBenchmarkSummary,
  formatLatency,
} from '../../../domain/ai/metrics.ts';
import { aiMetricsCacheService } from '../../../infrastructure/ai/telemetry/aiMetricsCacheService.ts';

interface ModelPerformanceInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelPerformanceInsightsModal: React.FC<ModelPerformanceInsightsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<OverallAiBenchmarkSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const insights = await aiMetricsCacheService.getModelInsights();
      setSummary(insights);
    } catch (err) {
      console.error('Failed to load AI model metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all model generation metrics and reset benchmarks?')) {
      setIsClearing(true);
      try {
        await aiMetricsCacheService.clearAllMetrics();
        await loadData();
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insights-modal-title"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="insights-modal-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2"
              >
                <span>AI Model Benchmark Insights</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Telemetry
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Cached &amp; persisted generation telemetry to discover the fastest and most reliable models.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh telemetry"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Fastest Model Card */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Fastest Model
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold">
                  {summary?.fastestModel ? formatLatency(summary.fastestModel.avgLatencyMs) : '--'}
                </span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-zinc-100 truncate">
                  {summary?.fastestModel?.displayName || 'No data yet'}
                </p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 uppercase font-mono mt-0.5">
                  {summary?.fastestModel ? `${summary.fastestModel.providerId} engine` : 'Run a query to benchmark'}
                </p>
              </div>
            </div>

            {/* Most Reliable Card */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Most Reliable
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-bold">
                  {summary?.mostReliableModel
                    ? `${Math.round(summary.mostReliableModel.successRate * 100)}%`
                    : '--'}
                </span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-zinc-100 truncate">
                  {summary?.mostReliableModel?.displayName || 'No data yet'}
                </p>
                <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 uppercase font-mono mt-0.5">
                  {summary?.mostReliableModel ? `${summary.mostReliableModel.successCalls} successful turns` : 'No errors logged'}
                </p>
              </div>
            </div>

            {/* Average Latency Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Avg Latency
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
                  Global
                </span>
              </div>
              <div>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-zinc-100">
                  {summary ? formatLatency(summary.overallAvgLatencyMs) : '0ms'}
                </p>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium mt-0.5">
                  Across all live requests
                </p>
              </div>
            </div>

            {/* Total Generations Card */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  Total Turns
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-800 dark:text-purple-200 font-bold">
                  Tracked
                </span>
              </div>
              <div>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-zinc-100">
                  {summary ? summary.totalGenerations : 0}
                </p>
                <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80 font-medium mt-0.5">
                  Cached &amp; persisted turns
                </p>
              </div>
            </div>
          </div>

          {/* Model Comparison Leaderboard Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Model Speed &amp; Reliability Leaderboard
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                Sorted by average speed (fastest first)
              </span>
            </div>

            {!summary || summary.modelInsights.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                <Gauge className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                  No model generation telemetry recorded yet.
                </p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                  Ask a question or use a Power Action with any model to automatically benchmark latency, speed, and reliability.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-zinc-900/80 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">Rank &amp; Model</th>
                      <th className="py-2.5 px-3 font-bold">Provider</th>
                      <th className="py-2.5 px-3 font-bold">Avg Latency</th>
                      <th className="py-2.5 px-3 font-bold">Speed Range</th>
                      <th className="py-2.5 px-3 font-bold">Throughput</th>
                      <th className="py-2.5 px-3 font-bold">Success Rate</th>
                      <th className="py-2.5 px-4 font-bold text-right">Calls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 font-medium">
                    {summary.modelInsights.map((item, index) => {
                      const isTopRanked = index === 0;

                      return (
                        <tr
                          key={`${item.providerId}::${item.modelId}`}
                          className={`hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors ${
                            item.isFastest ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          {/* Rank & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono shrink-0 ${
                                  isTopRanked
                                    ? 'bg-amber-400 text-slate-900 shadow-sm'
                                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                                }`}
                              >
                                {index + 1}
                              </span>
                              <div>
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-zinc-100">
                                    {item.displayName}
                                  </span>
                                  {item.isFastest && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                      <Zap className="w-2.5 h-2.5 fill-current" />
                                      Fastest
                                    </span>
                                  )}
                                  {item.isMostReliable && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                      Top Reliable
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500">
                                  {item.modelId}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Provider */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center space-x-1 text-[11px] font-mono uppercase text-slate-600 dark:text-zinc-300">
                              {item.providerId === 'groq' ? (
                                <>
                                  <Cpu className="w-3 h-3 text-amber-500" />
                                  <span>Groq</span>
                                </>
                              ) : item.providerId === 'gemini' ? (
                                <>
                                  <Sparkles className="w-3 h-3 text-purple-500" />
                                  <span>Gemini</span>
                                </>
                              ) : item.providerId === 'openrouter' ? (
                                <>
                                  <Globe className="w-3 h-3 text-indigo-500" />
                                  <span>OpenRouter</span>
                                </>
                              ) : (
                                <span>{item.providerId}</span>
                              )}
                            </span>
                          </td>

                          {/* Avg Latency */}
                          <td className="py-3 px-3 font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs ${
                                item.avgLatencyMs < 1000
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : item.avgLatencyMs < 2500
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              ⚡ {formatLatency(item.avgLatencyMs)}
                            </span>
                          </td>

                          {/* Min / Max Latency */}
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                            {formatLatency(item.minLatencyMs)} - {formatLatency(item.maxLatencyMs)}
                          </td>

                          {/* Characters / Second */}
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-zinc-300">
                            {item.charsPerSecEstimate > 0 ? `${item.charsPerSecEstimate} ch/s` : '--'}
                          </td>

                          {/* Success Rate */}
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1.5">
                              {item.successRate >= 0.95 ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className="font-mono font-bold text-[11px]">
                                {Math.round(item.successRate * 100)}%
                              </span>
                            </div>
                          </td>

                          {/* Calls Count */}
                          <td className="py-3 px-4 font-mono text-[11px] text-right text-slate-600 dark:text-zinc-400">
                            {item.totalCalls}
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

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400 dark:text-zinc-500 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Two-tier storage active: fast memory staging + local IndexedDB</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={isClearing || !summary || summary.totalGenerations === 0}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Benchmarks</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
