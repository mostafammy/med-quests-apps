/**
 * Presentation Component: AdminAccuracyAuditCenter
 * Cupertino-Grade World Class UI for Question Bank Accuracy & Quality Auditing
 * Designed with Apple Human Interface Guidelines:
 * - Fluid spring animations, glassmorphism, clarity, depth, and precision.
 * - Restricted exclusively to Platform Administrators.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Download,
  Search,
  RefreshCw,
  Play,
  Square,
  Lock,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  History,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import {
  useAdminAccuracyAuditStore,
  type AuditFilterVerdict,
} from '../../../../application/stores/useAdminAccuracyAuditStore.ts';
import type {
  SamplingStrategyType,
  AuditEvaluationDimension,
} from '../../../../domain/questionBank/accuracyAudit/types.ts';

const DIMENSION_LABELS: Record<AuditEvaluationDimension, { label: string; icon: string }> = {
  factual_accuracy: { label: 'Clinical Factuality', icon: '🩺' },
  single_best_answer_invariant: { label: 'SBA Invariant', icon: '🎯' },
  distractor_plausibility: { label: 'Distractor Quality', icon: '⚖️' },
  curriculum_evidence_grounding: { label: 'Evidence Grounding', icon: '📚' },
  pedagogical_clarity: { label: 'Pedagogical Clarity', icon: '✨' },
};

export const AdminAccuracyAuditCenter: React.FC = () => {
  const { authState } = useAuthStore();
  const {
    samplingConfig,
    setSamplingConfig,
    isAuditing,
    progress,
    error,
    currentReport,
    historicalReports,
    selectedQuestionId,
    filterVerdict,
    searchQuery,
    init,
    startAudit,
    abortAudit,
    selectQuestion,
    setFilterVerdict,
    setSearchQuery,
    selectHistoricalReport,
    deleteHistoricalReport,
    exportReport,
    flagQuestionForRemediation,
  } = useAdminAccuracyAuditStore();

  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [remediationFeedback, setRemediationFeedback] = useState<string | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const isAdmin = authState.status === 'authenticated-active' && authState.user.role === 'admin';

  // Security Wall: If non-admin, render Apple-standard security restriction badge
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 ring-1 ring-amber-500/20">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
          Restricted Administrative Domain
        </h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          The Question Bank Accuracy Audit Lab requires authenticated Platform Administrator
          entitlements (<code className="text-amber-500 font-mono text-xs">security_governance_admin</code>).
        </p>
      </div>
    );
  }

  // Filter questions
  const filteredQuestions = (currentReport?.questionResults || []).filter((q) => {
    if (filterVerdict !== 'all' && q.verdict !== filterVerdict) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchStem = q.questionStem.toLowerCase().includes(query);
      const matchConcept = (q.concept || '').toLowerCase().includes(query);
      const matchId = q.questionId.toLowerCase().includes(query);
      if (!matchStem && !matchConcept && !matchId) return false;
    }
    return true;
  });

  const handleExport = (format: 'json' | 'markdown' | 'csv') => {
    const text = exportReport(format);
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  const handleRemediate = async (questionId: string) => {
    const res = await flagQuestionForRemediation(questionId);
    setRemediationFeedback(res.message);
    setTimeout(() => setRemediationFeedback(null), 4000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER: Apple Executive Council Presentation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-br from-white/90 via-white/50 to-zinc-50/80 dark:from-zinc-900/80 dark:via-zinc-900/50 dark:to-zinc-950/80 backdrop-blur-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3 h-3" />
              Apple Quality Standards
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-3 h-3" />
              Admin Only
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-zinc-900 dark:text-zinc-50">
            Global Question Bank Accuracy Lab
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Autonomous multi-agent evaluation squad executing statistically unbiased random sampling
            to certify clinical factual accuracy, psychometric Single-Best-Answer invariants, and
            curriculum grounding.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-zinc-500" />
            Audit History ({historicalReports.length})
          </button>
        </div>
      </div>

      {/* SAMPLING & EXECUTION CONTROL PANEL */}
      <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Audit Sampling Parameters
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500">
            Finite Population Correction (FPC) Applied
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Strategy Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Sampling Strategy
            </label>
            <select
              value={samplingConfig.strategyType}
              onChange={(e) =>
                setSamplingConfig({
                  strategyType: e.target.value as SamplingStrategyType,
                })
              }
              disabled={isAuditing}
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="uniform_random">Uniform Random (Fisher-Yates)</option>
              <option value="stratified_by_subject">Stratified by Subject</option>
              <option value="stratified_by_difficulty">Stratified by Difficulty</option>
              <option value="stratified_by_cognitive_level">Stratified by Cognitive Level</option>
            </select>
          </div>

          {/* Sample Size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Sample Size
              </label>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {samplingConfig.sampleSize} items
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={samplingConfig.sampleSize}
              onChange={(e) => setSamplingConfig({ sampleSize: Number(e.target.value) })}
              disabled={isAuditing}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>5 (Quick)</span>
              <span>20 (Standard)</span>
              <span>50 (Deep Rigor)</span>
            </div>
          </div>

          {/* Random Seed (Optional for Deterministic Reproduction) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              Deterministic Seed
              <span className="text-[10px] font-normal text-zinc-400">(Optional)</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 42 (blank for CSPRNG)"
              value={samplingConfig.seed ?? ''}
              onChange={(e) =>
                setSamplingConfig({
                  seed: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              disabled={isAuditing}
              className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>

          {/* High Yield Toggle & CTA */}
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={Boolean(samplingConfig.highYieldOnly)}
                onChange={(e) => setSamplingConfig({ highYieldOnly: e.target.checked })}
                disabled={isAuditing}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              High-Yield Questions Only
            </label>

            {isAuditing ? (
              <button
                onClick={abortAudit}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all active:scale-98"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Abort Audit
              </button>
            ) : (
              <button
                onClick={() => startAudit()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 shadow-lg shadow-indigo-500/25 transition-all active:scale-98"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Sample & Audit Bank
              </button>
            )}
          </div>
        </div>

        {/* Real-time Streaming Progress Bar */}
        {isAuditing && progress && (
          <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{progress.message}</span>
              </div>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {progress.percentComplete}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-indigo-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* KPI DASHBOARD & AUDIT REPORT METRICS */}
      {currentReport && (
        <div className="space-y-6">
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
                    (currentReport.kpis.verifiedCount / currentReport.kpis.totalSampled) * 100
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
              {(Object.keys(DIMENSION_LABELS) as AuditEvaluationDimension[]).map((dim) => {
                const meta = DIMENSION_LABELS[dim];
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
              })}
            </div>
          </div>

          {/* SAMPLED QUESTIONS INSPECTOR */}
          <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4">
            {/* Filter and Export Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'verified', 'warning', 'critical_error'] as AuditFilterVerdict[]).map(
                  (tab) => {
                    const active = filterVerdict === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setFilterVerdict(tab)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                          active
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {tab.replace('_', ' ')}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Search & Export Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search question or concept..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport('markdown')}
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
                    onClick={() => handleExport('json')}
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
                    onClick={() => handleExport('csv')}
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
                      onClick={() => selectQuestion(isSelected ? null : q.questionId)}
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
                              ({q.subjectId} • diff {q.difficulty})
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
                              {q.critiques.map((critique) => (
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
                                      {critique.evaluation.findings.map((f, i) => (
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
                                handleRemediate(q.questionId);
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
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {remediationFeedback && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{remediationFeedback}</span>
        </div>
      )}

      {/* AUDIT HISTORY DRAWER / MODAL */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                Historical Accuracy Audits
              </h3>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Close
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {historicalReports.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No historical audits recorded. Run your first audit above!
                </div>
              ) : (
                historicalReports.map((report) => (
                  <div
                    key={report.runId}
                    onClick={() => {
                      selectHistoricalReport(report.runId);
                      setIsHistoryDrawerOpen(false);
                    }}
                    className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {new Date(report.timestamp).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Sample: {report.extractionMetadata.sampledCount} questions • Strategy:{' '}
                        {report.configuration.strategyType}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {report.kpis.overallAccuracyIndex}%
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoricalReport(report.runId);
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
