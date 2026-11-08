import React from 'react';
import { Scale, RotateCcw } from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../../domain/questionBank/aiQuestionParser/types.ts';

interface CanvasQuorumTabProps {
  readonly item: ParsedQuestionItem;
  readonly onRunConsensus: () => void;
  readonly isVerifyingConsensus: boolean;
}

export const CanvasQuorumTab: React.FC<CanvasQuorumTabProps> = ({
  item,
  onRunConsensus,
  isVerifyingConsensus,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {item.consensusSummary ? (
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Scale className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Multi-Model Quorum Consensus
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  item.consensusSummary.consensusVerdict ===
                  'unanimous_agreement'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                    : item.consensusSummary.consensusVerdict ===
                      'majority_consensus'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                }`}
              >
                {item.consensusSummary.consensusVerdict ===
                  'unanimous_agreement' && '✅ 100% Unanimous Agreement'}
                {item.consensusSummary.consensusVerdict ===
                  'majority_consensus' &&
                  `✨ Majority Quorum (${Math.round(item.consensusSummary.agreementRatio * 100)}%)`}
                {item.consensusSummary.consensusVerdict ===
                  'discrepancy_detected' && '⚠️ Model Discrepancy Detected'}
                {item.consensusSummary.consensusVerdict ===
                  'insufficient_quorum' && 'Quorum Undetermined'}
              </span>
            </div>

            <button
              type="button"
              onClick={onRunConsensus}
              disabled={isVerifyingConsensus}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${isVerifyingConsensus ? 'animate-spin' : ''}`}
              />
              <span>
                {isVerifyingConsensus
                  ? 'Re-checking Quorum…'
                  : 'Re-verify with Ensemble'}
              </span>
            </button>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {item.consensusSummary.consensusRationale}
          </p>

          {/* Model Verdicts Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {item.consensusSummary.modelVerdicts.map((v) => {
              const isSuccess = v.status === 'success';
              const isConsensusWinner =
                isSuccess &&
                v.selectedChoiceId === item.consensusSummary?.consensusChoiceId;
              return (
                <div
                  key={v.modelId}
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-1.5 ${
                    !isSuccess
                      ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 opacity-80'
                      : isConsensusWinner
                      ? 'bg-white dark:bg-zinc-800 border-emerald-500/40 shadow-2xs ring-1 ring-emerald-500/20'
                      : 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {v.modelName}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        !isSuccess
                          ? 'bg-rose-500/10 text-rose-600'
                          : isConsensusWinner
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700'
                      }`}
                    >
                      Choice {v.selectedChoiceId?.toUpperCase() || '—'}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {v.clinicalRationale ||
                      v.errorMessage ||
                      'No critique supplied.'}
                  </p>

                  <div className="text-[9px] font-mono text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-750">
                    Latency: {v.latencyMs}ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
          <Scale className="w-8 h-8 text-purple-400 mx-auto" />
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Multi-Model Cross-Examination Ensemble was skipped for fast
            ingestion.
          </div>
          <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
            You can trigger on-demand consensus to query Gemini, Claude, and
            DeepSeek concurrently to detect any potential distractor
            hallucinations.
          </p>
          <button
            type="button"
            onClick={onRunConsensus}
            disabled={isVerifyingConsensus}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-sm cursor-pointer transition-all disabled:opacity-50"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${isVerifyingConsensus ? 'animate-spin' : ''}`}
            />
            <span>
              {isVerifyingConsensus
                ? 'Executing Ensemble Check…'
                : 'Cross-Examine with Quorum'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
