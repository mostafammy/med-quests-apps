/**
 * Apple Intelligence Agent Orchestration Telemetry & Interactive Neural Bus
 * Design System: macOS Sonoma & iPadOS Human Interface Guidelines (HIG)
 *
 * Provides a fluid, interactive visual experience with:
 * - Liquid gradient glow aura & live Siri/Apple Intelligence neural waveform
 * - Interactive connected neural bus with energetic glowing pulses between tools
 * - Deep click-to-inspect step drawers for each tool in the pipeline
 * - Real-time millisecond execution stopwatch and instant abort capability
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Activity,
  Cpu,
  Layers,
  Scale,
  CheckCircle2,
  Clock,
  StopCircle,
  Loader2,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Terminal,
  Play,
} from 'lucide-react';
import type {
  AgentExecutionTelemetry,
  AgentToolStepId,
} from '../../../../domain/questionBank/aiQuestionParser/types.ts';

interface AppleIntelligenceAgentOrchestratorProps {
  readonly telemetry: AgentExecutionTelemetry;
  readonly isParsing: boolean;
  readonly onAbort: () => void;
  readonly activeModelName?: string;
  readonly stemMode?: 'verbatim' | 'vignette';
  readonly enableConsensusCheck?: boolean;
}

const TOOL_ICONS: Record<AgentToolStepId, React.ElementType> = {
  segmentation: FileText,
  taxonomy: Layers,
  reasoning: Cpu,
  consensus: Scale,
  validation: ShieldCheck,
};

export const AppleIntelligenceAgentOrchestrator: React.FC<AppleIntelligenceAgentOrchestratorProps> = ({
  telemetry,
  isParsing,
  onAbort,
  activeModelName = 'Google Gemini 2.5 Flash',
  stemMode = 'verbatim',
  enableConsensusCheck = false,
}) => {
  const [selectedStepId, setSelectedStepId] = useState<AgentToolStepId | null>(
    telemetry.currentStepId || 'reasoning'
  );
  const [isInspectorExpanded, setIsInspectorExpanded] = useState<boolean>(true);
  const [isSimulatingReplay, setIsSimulatingReplay] = useState<boolean>(false);
  const [replayStepIndex, setReplayStepIndex] = useState<number>(-1);

  // Auto-focus active running step when telemetry changes
  React.useEffect(() => {
    if (telemetry.currentStepId) {
      setSelectedStepId(telemetry.currentStepId);
    }
  }, [telemetry.currentStepId]);

  const handleReplay = () => {
    setIsSimulatingReplay(true);
    setReplayStepIndex(0);

    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx < telemetry.steps.length) {
        setReplayStepIndex(idx);
        setSelectedStepId(telemetry.steps[idx].id);
      } else {
        clearInterval(interval);
        setIsSimulatingReplay(false);
        setReplayStepIndex(-1);
      }
    }, 600);
  };

  const selectedStep = telemetry.steps.find((s) => s.id === selectedStepId) || telemetry.steps[0];
  const SelectedIcon = TOOL_ICONS[selectedStep.id] || Sparkles;

  const completedCount = telemetry.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length;
  const progressPercent = Math.round((completedCount / telemetry.steps.length) * 100);

  return (
    <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-r from-purple-500/40 via-indigo-500/40 via-pink-500/40 to-cyan-500/40 shadow-2xl transition-all duration-500 overflow-hidden">
      {/* Outer Glow Halo */}
      {telemetry.isRunning && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-cyan-600/20 blur-xl animate-pulse -z-10 pointer-events-none" />
      )}

      {/* Main Glassmorphic Deck */}
      <div className="rounded-[22px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl p-5 sm:p-6 space-y-5">
        {/* TOP STATUS BAR: Fluid Aura & Spectrum */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            {/* Pulsing Neural Node / Siri Waveform */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
              <Activity className={`w-5 h-5 ${telemetry.isRunning ? 'animate-pulse' : ''}`} />
              {telemetry.isRunning && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-zinc-900 animate-ping" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold font-heading text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <span>Apple Intelligence Agent Pipeline</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                    Orchestrator v2.5
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span>Ordered execution: 5 Autonomous Tools</span>
                <span>•</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                  {telemetry.activeToolName || 'Idle'}
                </span>
              </div>
            </div>
          </div>

          {/* SENSOR HUD: Live Waveform, Elapsed Timer & Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Waveform Spectrum Bars */}
            <div className="flex items-end gap-1 h-6 px-3 py-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 shadow-inner">
              {[40, 75, 55, 90, 65, 80, 45].map((height, i) => (
                <span
                  key={i}
                  style={{
                    height: telemetry.isRunning ? `${Math.max(20, (height * (i % 2 === 0 ? 1 : 0.8)))}%` : '30%',
                    animationDuration: `${0.6 + (i * 0.15)}s`,
                  }}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    telemetry.isRunning
                      ? 'bg-gradient-to-t from-purple-500 to-pink-500 animate-pulse'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
              ))}
              <span className="text-[10px] font-mono text-zinc-400 font-bold ml-1.5">
                {telemetry.isRunning ? 'BUS BUSY' : 'SYNCED'}
              </span>
            </div>

            {/* Stopwatch Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 text-xs font-mono text-zinc-600 dark:text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{(telemetry.elapsedMs / 1000).toFixed(2)}s</span>
            </div>

            {/* Replay Visualizer Button */}
            {!telemetry.isRunning && (
              <button
                type="button"
                onClick={handleReplay}
                disabled={isSimulatingReplay}
                title="Replay the neural bus packet animation"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Replay Trace</span>
              </button>
            )}

            {/* Cancel Button */}
            {(telemetry.isRunning || isParsing) && (
              <button
                type="button"
                onClick={onAbort}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 shadow-xs transition-all cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Abort Run</span>
              </button>
            )}
          </div>
        </div>

        {/* PROGRESS BEAM */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span>Pipeline Stage {completedCount} of {telemetry.steps.length}</span>
              {telemetry.isRunning && <span className="animate-pulse text-purple-500 font-bold">● Streaming</span>}
            </span>
            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
            />
          </div>
        </div>

        {/* INTERACTIVE NEURAL STEPPER BUS */}
        <div className="relative">
          {/* Animated Connecting Bus Track (Desktop Only) */}
          <div className="hidden lg:block absolute top-[28px] left-[5%] right-[5%] h-[2px] bg-zinc-200 dark:bg-zinc-800 -z-0">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all duration-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative z-10">
            {telemetry.steps.map((step, idx) => {
              const isSelected = selectedStepId === step.id;
              const isRunning = step.status === 'running' || (isSimulatingReplay && replayStepIndex === idx);
              const isDone = step.status === 'completed';
              const isSkipped = step.status === 'skipped';
              const isFailed = step.status === 'failed';
              const Icon = TOOL_ICONS[step.id] || Sparkles;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setSelectedStepId(step.id);
                    setIsInspectorExpanded(true);
                  }}
                  className={`text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 relative group overflow-hidden ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-800 border-purple-500/60 shadow-lg ring-2 ring-purple-500/20'
                      : 'bg-white/70 dark:bg-zinc-850/60 border-zinc-200/80 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  } ${isRunning ? 'animate-pulse ring-2 ring-purple-500/40' : ''}`}
                >
                  {/* Top Header of Node */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                          isRunning
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/40'
                            : isDone
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : isSkipped
                            ? 'bg-zinc-200/50 dark:bg-zinc-700/50 text-zinc-400'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {isRunning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Icon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-400">
                        0{idx + 1}
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-all ${
                        isRunning
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 animate-pulse'
                          : isDone
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : isSkipped
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                          : isFailed
                          ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {isRunning ? 'Running' : isDone ? 'Done' : isSkipped ? 'Skipped' : 'Queued'}
                    </span>
                  </div>

                  {/* Body: Tool Title */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {step.label}
                    </h4>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                      {step.detail || step.description}
                    </p>
                  </div>

                  {/* Footer Metrics */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 w-full">
                    <span>{step.toolName.replace('Tool', '')}</span>
                    <span>{step.durationMs !== undefined ? `${step.durationMs}ms` : '—'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DEEP INTERACTIVE STEP INSPECTOR (THE DRILLDOWN LENS) */}
        <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
            className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-purple-500" />
              <span>Deep Tool Telemetry Inspector:</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md text-[11px]">
                {selectedStep.toolName}
              </span>
            </div>

            <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-medium">
              <span>{isInspectorExpanded ? 'Collapse Inspector' : 'Expand Inspector'}</span>
              {isInspectorExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {isInspectorExpanded && (
            <div className="p-4 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Metric 1: Tool Purpose */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Purpose & Capability
                  </div>
                  <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                    {selectedStep.description}
                  </div>
                </div>

                {/* Metric 2: Live Status & Benchmark */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Execution Latency & Status
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Latency: {selectedStep.durationMs !== undefined ? `${selectedStep.durationMs}ms` : 'Pending'}</span>
                    <span className="text-[10px] text-zinc-400">({selectedStep.status})</span>
                  </div>
                </div>

                {/* Metric 3: Active Architecture Mode */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Active Architecture Target
                  </div>
                  <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5">
                    <SelectedIcon className="w-3.5 h-3.5 text-purple-500" />
                    <span>
                      {selectedStep.id === 'reasoning'
                        ? `${activeModelName} (${stemMode})`
                        : selectedStep.id === 'consensus'
                        ? (enableConsensusCheck ? '4-Model Quorum Ensemble' : 'Single Engine Pass')
                        : 'Deterministic Engine'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Tool Telemetry String */}
              <div className="p-3 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed shadow-inner border border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5 text-zinc-500 text-[10px]">
                  <span>AGENT_EXECUTION_TRACE_STREAM</span>
                  <span>STEP_ID: {selectedStep.id.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-purple-400">[Antigravity Engine]</span>{' '}
                  {selectedStep.detail || 'Tool queued in memory waiting for previous pipeline stage resolution.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
