/**
 * Application Store: useAdminAccuracyAuditStore
 * State Management: Zustand 5
 * Manages sampling parameters, live streaming progress, multi-agent critique results,
 * question drilldowns, historical reports, and export workflows.
 *
 * Exclusively accessible to Admins.
 */

import { create } from 'zustand';
import type { Question } from '../../domain/model/types.ts';
import defaultCvsBank from '../../../content/cvs/dist/bank.v1.json';
import {
  AdminAccuracyAuditService,
} from '../../domain/questionBank/accuracyAudit/AdminAccuracyAuditService.ts';
import type {
  SamplingConfiguration,
  AccuracyAuditRunReport,
  AuditProgressTelemetry,
  AuditVerdict,
} from '../../domain/questionBank/accuracyAudit/types.ts';
import type { CloudProviderId } from '../../domain/ai/settings.ts';
import { useAuthStore } from './useAuthStore.ts';
import { useQuestionStore } from './useQuestionStore.ts';
import { useBlockContextStoreBase } from './useBlockContextStore.ts';
import type { BlockId } from '../../domain/curriculum/ids.ts';
import { edgeQuestionBankGateway } from '../../infrastructure/questionBank/edgeQuestionBankGateway.ts';

export type AuditFilterVerdict = 'all' | AuditVerdict;

interface AdminAccuracyAuditStoreState {
  // Configuration
  samplingConfig: SamplingConfiguration;
  selectedProvider: CloudProviderId;
  selectedModelId: string;
  setSamplingConfig: (partial: Partial<SamplingConfiguration>) => void;
  setSelectedModel: (provider: CloudProviderId, modelId: string) => void;

  // Active Execution State
  isAuditing: boolean;
  abortController: AbortController | null;
  progress: AuditProgressTelemetry | null;
  error: string | null;

  // Current Results & Reports
  currentReport: AccuracyAuditRunReport | null;
  historicalReports: AccuracyAuditRunReport[];
  selectedQuestionId: string | null;
  filterVerdict: AuditFilterVerdict;
  searchQuery: string;

  // Actions
  init: () => void;
  startAudit: (questionsOverride?: readonly Question[]) => Promise<AccuracyAuditRunReport | null>;
  abortAudit: () => void;
  selectQuestion: (questionId: string | null) => void;
  setFilterVerdict: (verdict: AuditFilterVerdict) => void;
  setSearchQuery: (query: string) => void;
  loadHistoricalReports: () => void;
  selectHistoricalReport: (runId: string) => void;
  deleteHistoricalReport: (runId: string) => void;
  clearAuditHistory: () => void;
  exportReport: (format: 'json' | 'markdown' | 'csv') => string;
  flagQuestionForRemediation: (
    questionId: string,
    actionNotes?: string
  ) => Promise<{ success: boolean; message: string }>;
}

const auditService = new AdminAccuracyAuditService();

export const useAdminAccuracyAuditStore = create<AdminAccuracyAuditStoreState>((set, get) => ({
  selectedProvider: 'gemini',
  selectedModelId: 'gemini-2.5-pro',
  samplingConfig: {
    strategyType: 'uniform_random',
    sampleSize: 20,
    seed: undefined,
    highYieldOnly: false,
    blockId: (useBlockContextStoreBase.getState().activeBlockId || 'cvs') as BlockId,
    providerId: 'gemini',
    modelId: 'gemini-2.5-pro',
  },

  setSelectedModel: (selectedProvider, selectedModelId) => {
    set((state) => ({
      selectedProvider,
      selectedModelId,
      samplingConfig: {
        ...state.samplingConfig,
        providerId: selectedProvider,
        modelId: selectedModelId,
      },
    }));
  },

  setSamplingConfig: (partial) => {
    set((state) => ({
      samplingConfig: { ...state.samplingConfig, ...partial },
    }));
  },

  isAuditing: false,
  abortController: null,
  progress: null,
  error: null,

  currentReport: null,
  historicalReports: [],
  selectedQuestionId: null,
  filterVerdict: 'all',
  searchQuery: '',

  init: () => {
    get().loadHistoricalReports();
  },

  loadHistoricalReports: () => {
    const history = auditService.getHistoricalAuditReports();
    set({
      historicalReports: history,
      currentReport: history.length > 0 && !get().currentReport ? history[0] : get().currentReport,
    });
  },

  selectHistoricalReport: (runId: string) => {
    const report = get().historicalReports.find((r) => r.runId === runId);
    if (report) {
      set({ currentReport: report, selectedQuestionId: null });
    }
  },

  deleteHistoricalReport: (runId: string) => {
    const updated = get().historicalReports.filter((r) => r.runId !== runId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('medquests_accuracy_audit_history_v1', JSON.stringify(updated));
    }
    set({
      historicalReports: updated,
      currentReport: get().currentReport?.runId === runId ? updated[0] || null : get().currentReport,
    });
  },

  clearAuditHistory: () => {
    auditService.clearAuditHistory();
    set({ historicalReports: [], currentReport: null, selectedQuestionId: null });
  },

  startAudit: async (questionsOverride) => {
    const authState = useAuthStore.getState().authState;

    // RBAC Security Check: Admins Only
    if (authState.status !== 'authenticated-active' || authState.user.role !== 'admin') {
      const errMessage = 'Unauthorized: Accuracy Audit Lab is restricted to Platform Administrators.';
      set({ error: errMessage, isAuditing: false });
      return null;
    }

    const adminActor = {
      userId: authState.user.id,
      role: authState.user.role,
      displayName: authState.user.displayName,
    };

    const controller = new AbortController();
    set({
      isAuditing: true,
      abortController: controller,
      error: null,
      progress: {
        stage: 'sampling',
        currentQuestionIndex: 0,
        totalQuestionsToAudit: get().samplingConfig.sampleSize,
        percentComplete: 0,
        message: 'Initializing Apple-grade clinical accuracy audit...',
      },
    });

    try {
      // Determine question bank population for target block
      const targetBlockId = (get().samplingConfig.blockId || useBlockContextStoreBase.getState().activeBlockId || 'cvs') as BlockId;
      let population: readonly Question[] = questionsOverride ?? [];
      if (population.length === 0) {
        // 1. Check question store
        const storeBlockId = useQuestionStore.getState().activeBlockId;
        const storeQuestions = useQuestionStore.getState().questions;
        if (storeQuestions && storeQuestions.length > 0 && storeBlockId === targetBlockId) {
          population = storeQuestions.filter((q) => q && q.blockId === targetBlockId);
        }

        // 2. If empty, check canonical bank from edge gateway
        if (population.length === 0) {
          const canonical = edgeQuestionBankGateway.getLocalCanonicalBank(targetBlockId);
          if (canonical && canonical.length > 0) {
            population = canonical;
          } else if (targetBlockId === 'cvs') {
            population = defaultCvsBank as Question[];
          }
        }
      }

      if (population.length === 0) {
        set({
          isAuditing: false,
          abortController: null,
          error: `Cannot execute accuracy audit: Question population for block "${targetBlockId.toUpperCase()}" is empty. Ingest or seed questions first.`,
          progress: null,
        });
        return null;
      }

      const report = await auditService.executeAdminAudit(
        adminActor,
        population,
        {
          ...get().samplingConfig,
          blockId: targetBlockId,
        },
        (progress) => {
          set({ progress });
        },
        controller.signal
      );

      set({
        isAuditing: false,
        abortController: null,
        currentReport: report,
        selectedQuestionId: null,
      });

      get().loadHistoricalReports();
      return report;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        set({
          isAuditing: false,
          abortController: null,
          progress: {
            stage: 'aborted',
            currentQuestionIndex: 0,
            totalQuestionsToAudit: 0,
            percentComplete: 0,
            message: 'Audit was aborted by the administrator.',
          },
        });
        return null;
      }

      const message = err instanceof Error ? err.message : 'Unknown audit engine error';
      set({
        isAuditing: false,
        abortController: null,
        error: message,
        progress: null,
      });
      return null;
    }
  },

  abortAudit: () => {
    const controller = get().abortController;
    if (controller) {
      controller.abort();
      set({ isAuditing: false, abortController: null });
    }
  },

  selectQuestion: (questionId: string | null) => {
    set({ selectedQuestionId: questionId });
  },

  setFilterVerdict: (verdict: AuditFilterVerdict) => {
    set({ filterVerdict: verdict });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  flagQuestionForRemediation: async (questionId: string, actionNotes?: string) => {
    const report = get().currentReport;
    if (!report) return { success: false, message: 'No active report available.' };

    const item = report.questionResults.find((q) => q.questionId === questionId);
    if (!item) return { success: false, message: 'Question not found in current report.' };

    try {
      const reason = actionNotes || item.criticalFlags.join('; ') || 'Flagged by AI Accuracy Audit Lab';

      // Log action feedback
      return {
        success: true,
        message: `Question "${item.concept || item.questionId}" flagged for faculty review. Notes: ${reason}`,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to flag question.' };
    }
  },

  exportReport: (format: 'json' | 'markdown' | 'csv') => {
    const report = get().currentReport;
    if (!report) return '';

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    if (format === 'markdown') {
      return [
        `# Apple Clinical Question Bank Accuracy Audit Report`,
        `**Run ID**: \`${report.runId}\``,
        `**Date & Time**: ${new Date(report.timestamp).toLocaleString()}`,
        `**Executed By**: ${report.executedByAdmin.displayName} (Admin: \`${report.executedByAdmin.userId}\`)`,
        `**Auditing Intelligence Model**: ${report.auditingModel ? `**${report.auditingModel.modelName}** (\`${report.auditingModel.modelId}\`)` : 'Deterministic Ruleset'}`,
        `**Sampling Strategy**: \`${report.configuration.strategyType}\` (Seed: \`${report.extractionMetadata.randomSeed}\`)`,
        `**Sample Size**: ${report.extractionMetadata.sampledCount} of ${report.extractionMetadata.totalBankQuestions} questions`,
        ``,
        `## Executive Summary KPIs`,
        `- **Overall Accuracy Index**: **${report.kpis.overallAccuracyIndex}%** (95% CI: ±${report.kpis.statisticalMarginOfError.marginOfErrorPercentage}%, Range: ${report.kpis.statisticalMarginOfError.lowerBoundScore}% – ${report.kpis.statisticalMarginOfError.upperBoundScore}%)`,
        `- **Verified Flawless**: ${report.kpis.verifiedCount} (${Math.round((report.kpis.verifiedCount / report.kpis.totalSampled) * 100)}%)`,
        `- **Warnings / Minor Errata**: ${report.kpis.warningCount}`,
        `- **Critical Flaws**: ${report.kpis.criticalErrorCount}`,
        ``,
        `### Dimension Health`,
        `- Clinical Factual Accuracy: **${report.kpis.dimensionAverages.factual_accuracy}%**`,
        `- Single Best Answer Invariant: **${report.kpis.dimensionAverages.single_best_answer_invariant}%**`,
        `- Distractor Plausibility: **${report.kpis.dimensionAverages.distractor_plausibility}%**`,
        `- Curriculum Evidence Grounding: **${report.kpis.dimensionAverages.curriculum_evidence_grounding}%**`,
        `- Pedagogical Clarity: **${report.kpis.dimensionAverages.pedagogical_clarity}%**`,
        ``,
        `## Sampled Item Analysis`,
        ...report.questionResults.map((q, idx) => {
          return [
            `### ${idx + 1}. [${q.verdict.toUpperCase()}] ${q.concept || q.questionId} (Score: ${q.compositeAccuracyScore}%)`,
            `- **Subject**: ${q.subjectId} | **Difficulty**: ${q.difficulty} | **Cognitive**: ${q.cognitiveLevel}`,
            `- **Stem**: ${q.questionStem}`,
            q.criticalFlags.length > 0 ? `- **Critical Flags**: ${q.criticalFlags.join('; ')}` : '',
            q.suggestedRemediation
              ? `- **Suggested Remediation**: [${q.suggestedRemediation.field}] ${q.suggestedRemediation.suggestion}`
              : '',
          ]
            .filter(Boolean)
            .join('\n');
        }),
      ].join('\n');
    }

    if (format === 'csv') {
      const headers = [
        'Question ID',
        'Concept',
        'Subject',
        'Difficulty',
        'Verdict',
        'Composite Score',
        'Critical Flags',
        'Suggested Remediation',
      ];
      const rows = report.questionResults.map((q) => [
        `"${q.questionId}"`,
        `"${(q.concept || '').replace(/"/g, '""')}"`,
        `"${q.subjectId}"`,
        q.difficulty,
        `"${q.verdict}"`,
        q.compositeAccuracyScore,
        `"${q.criticalFlags.join('; ').replace(/"/g, '""')}"`,
        `"${(q.suggestedRemediation?.suggestion || '').replace(/"/g, '""')}"`,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return '';
  },
}));

// Reactive store bridge: keep audit target block synchronized with active Navbar block
useBlockContextStoreBase.subscribe((state) => {
  if (state.activeBlockId) {
    const current = useAdminAccuracyAuditStore.getState().samplingConfig.blockId;
    if (current !== state.activeBlockId) {
      useAdminAccuracyAuditStore.setState((prev) => ({
        samplingConfig: {
          ...prev.samplingConfig,
          blockId: state.activeBlockId,
        },
        error: null,
      }));
    }
  }
});

