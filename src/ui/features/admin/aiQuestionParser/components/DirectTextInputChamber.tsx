import React from 'react';
import {
  FileText,
  HelpCircle,
  StopCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { AgentExecutionTelemetry } from '../../../../../domain/questionBank/aiQuestionParser/types.ts';
import { AppleIntelligenceAgentOrchestrator } from '../AppleIntelligenceAgentOrchestrator.tsx';

interface DirectTextInputChamberProps {
  readonly chamberRef: React.RefObject<HTMLDivElement | null>;
  readonly orchestratorRef: React.RefObject<HTMLDivElement | null>;
  readonly rawInputText: string;
  readonly setRawInputText: (text: string) => void;
  readonly isParsing: boolean;
  readonly onLoadSample: () => void;
  readonly onAbort: () => void;
  readonly onParse: () => void;
  readonly agentTelemetry: AgentExecutionTelemetry | null;
  readonly activeModelName: string;
  readonly stemMode: 'verbatim' | 'vignette';
  readonly enableConsensusCheck: boolean;
  readonly exitState: string;
  readonly error: string | null;
}

export const DirectTextInputChamber: React.FC<DirectTextInputChamberProps> = ({
  chamberRef,
  orchestratorRef,
  rawInputText,
  setRawInputText,
  isParsing,
  onLoadSample,
  onAbort,
  onParse,
  agentTelemetry,
  activeModelName,
  stemMode,
  enableConsensusCheck,
  exitState,
  error,
}) => {
  return (
    <div
      ref={chamberRef}
      className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-4 scroll-mt-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Direct Text Ingestion
          </h2>
        </div>
        <button
          type="button"
          onClick={onLoadSample}
          className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
        >
          Load Sample Unformatted Questions
        </button>
      </div>

      <div className="relative">
        <textarea
          rows={8}
          placeholder={`Paste raw clinical questions here in any format (e.g. from Word, PDF, or unformatted notes)...\n\nExample:\n1. A 62-year-old male presents with exertional chest pain...\nA. Stable angina\nB. Unstable angina\nC. GERD\nD. Costochondritis\n(Answer key can be included or omitted; AI will detect and deduce if missing)`}
          value={rawInputText}
          onChange={(e) => setRawInputText(e.target.value)}
          disabled={isParsing}
          className="w-full text-xs font-mono p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 transition-all shadow-inner leading-relaxed"
        />
      </div>

      {/* Action Button & Parsing Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>
            The AI will format into 4-choice SBAs, deduce missing keys, assign
            curriculum chapters, and execute multi-model cross-examinations.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isParsing && (
            <button
              type="button"
              onClick={onAbort}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-all cursor-pointer"
            >
              <StopCircle className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Cancel Execution</span>
            </button>
          )}

          <button
            type="button"
            onClick={onParse}
            disabled={isParsing || !rawInputText.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 shadow-md shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed apple-spring-transform"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isParsing
                ? agentTelemetry?.activeToolName
                  ? `Running: ${agentTelemetry.activeToolName}...`
                  : 'Executing AI Medical Analysis...'
                : 'Parse & Format Questions'}
            </span>
          </button>
        </div>
      </div>

      {/* APPLE INTELLIGENCE INTERACTIVE NEURAL ORCHESTRATOR */}
      {agentTelemetry && (
        <div
          ref={orchestratorRef}
          className={`scroll-mt-6 transition-all duration-500 ${
            exitState === 'dusting' ? 'apple-dust-exit' : ''
          }`}
        >
          <AppleIntelligenceAgentOrchestrator
            telemetry={agentTelemetry}
            isParsing={isParsing}
            onAbort={onAbort}
            activeModelName={activeModelName}
            stemMode={stemMode}
            enableConsensusCheck={enableConsensusCheck}
          />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
