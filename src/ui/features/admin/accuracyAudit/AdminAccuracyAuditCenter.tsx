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
  Lock,
  History,
} from 'lucide-react';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import { useActiveBlock } from '../../../../application/stores/useBlockContextStore.ts';
import { useAdminAccuracyAuditStore } from '../../../../application/stores/useAdminAccuracyAuditStore.ts';
import type { AuditEvaluationDimension } from '../../../../domain/questionBank/accuracyAudit/types.ts';
import {
  AuditSamplingParametersDeck,
  type AuditModelOption,
} from './components/AuditSamplingParametersDeck.tsx';
import { AuditReportMetricsDeck } from './components/AuditReportMetricsDeck.tsx';
import { AuditQuestionResultsTable } from './components/AuditQuestionResultsTable.tsx';
import { AuditHistoryModal } from './components/AuditHistoryModal.tsx';

const AUDIT_MODEL_OPTIONS: AuditModelOption[] = [
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    badge: 'Flagship • Deep Clinical Reasoning (1M TPM)',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    badge: 'Lightning Fast (Sub-second)',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-120b',
    name: 'Groq GPT-OSS 120B',
    badge: 'Ultra-Fast Complex Analysis',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-3.5-flash-lite',
    name: 'Google Gemini 3.5 Flash-Lite',
    badge: 'Ultra-Fast Verification (<100ms)',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-20b',
    name: 'Groq GPT-OSS 20B',
    badge: 'Instant Baseline (<100ms)',
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B (via OpenRouter)',
    badge: '550B Clinical Reasoning',
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Nemotron 3.5 Super VL (via OpenRouter)',
    badge: 'Clinical Logic Specialist',
  },
];

const DIMENSION_LABELS: Record<
  AuditEvaluationDimension,
  { label: string; icon: string }
> = {
  factual_accuracy: { label: 'Clinical Factuality', icon: '🩺' },
  single_best_answer_invariant: { label: 'SBA Invariant', icon: '🎯' },
  distractor_plausibility: { label: 'Distractor Quality', icon: '⚖️' },
  curriculum_evidence_grounding: { label: 'Evidence Grounding', icon: '📚' },
  pedagogical_clarity: { label: 'Pedagogical Clarity', icon: '✨' },
};

export const AdminAccuracyAuditCenter: React.FC = () => {
  const { authState } = useAuthStore();
  const { activeBlockId, block } = useActiveBlock();
  const {
    samplingConfig,
    setSamplingConfig,
    selectedProvider,
    selectedModelId,
    setSelectedModel,
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
  const [remediationFeedback, setRemediationFeedback] = useState<string | null>(
    null
  );
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const isAdmin =
    authState.status === 'authenticated-active' &&
    authState.user.role === 'admin';

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
          The Question Bank Accuracy Audit Lab requires authenticated Platform
          Administrator entitlements (
          <code className="text-amber-500 font-mono text-xs">
            security_governance_admin
          </code>
          ).
        </p>
      </div>
    );
  }

  const filteredQuestions = (currentReport?.questionResults || []).filter(
    (q) => {
      if (!q) return false;
      if (filterVerdict !== 'all' && q.verdict !== filterVerdict) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchStem = (q.questionStem || '').toLowerCase().includes(query);
        const matchConcept = (q.concept || '').toLowerCase().includes(query);
        const matchId = (q.questionId || '').toLowerCase().includes(query);
        if (!matchStem && !matchConcept && !matchId) return false;
      }
      return true;
    }
  );

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
            Autonomous multi-agent evaluation squad executing statistically
            unbiased random sampling to certify clinical factual accuracy,
            psychometric Single-Best-Answer invariants, and curriculum
            grounding.
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
      <AuditSamplingParametersDeck
        block={block}
        activeBlockId={activeBlockId}
        selectedProvider={selectedProvider}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModel}
        modelOptions={AUDIT_MODEL_OPTIONS}
        samplingConfig={samplingConfig}
        onUpdateSamplingConfig={setSamplingConfig}
        isAuditing={isAuditing}
        progress={progress}
        onStartAudit={startAudit}
        onAbortAudit={abortAudit}
        error={error}
      />

      {/* AUDIT REPORT DASHBOARD */}
      {currentReport && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          <AuditReportMetricsDeck
            currentReport={currentReport}
            dimensionLabels={DIMENSION_LABELS}
          />

          <AuditQuestionResultsTable
            filteredQuestions={filteredQuestions}
            filterVerdict={filterVerdict}
            onSetFilterVerdict={setFilterVerdict}
            searchQuery={searchQuery}
            onSetSearchQuery={setSearchQuery}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={selectQuestion}
            onExport={handleExport}
            copiedFormat={copiedFormat}
            onRemediate={handleRemediate}
          />
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {remediationFeedback && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{remediationFeedback}</span>
        </div>
      )}

      {/* AUDIT HISTORY MODAL */}
      <AuditHistoryModal
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        historicalReports={historicalReports}
        onSelectReport={selectHistoricalReport}
        onDeleteReport={deleteHistoricalReport}
      />
    </div>
  );
};
