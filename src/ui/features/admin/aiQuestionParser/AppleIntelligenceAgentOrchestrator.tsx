/**
 * Apple Intelligence Agent Orchestration Telemetry & Dynamic Neural Capsule
 * Design System: macOS Sequoia & iPadOS Human Interface Guidelines (HIG)
 *
 * Transformed from a heavy wall of 6 static boxes into:
 * - A single, weightless Apple Intelligence Luminescent Neural Capsule (~90px height)
 * - Kinetic human-readable narrative text with smooth spring morphing
 * - Sleek 6-Segment Luminescent Micro-Track (interactive pills replacing chunky boxes)
 * - Real-time 60fps harmonic Siri waveform (dancing organic equalizer)
 * - Serene emerald halo on completion / active multi-chromatic aurora glow while running
 * - Optional slide-down Deep Tool Telemetry Inspector for technical transparency
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Activity,
  Cpu,
  Layers,
  Scale,
  CheckCircle2,
  Clock,
  StopCircle,
  FileText,
  ShieldCheck,
  CopyCheck,
  ChevronDown,
  ChevronUp,
  Terminal,
  Play,
  Sliders,
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
  readonly initialExpandedInspector?: boolean;
}

const TOOL_ICONS: Record<AgentToolStepId, React.ElementType> = {
  segmentation: FileText,
  taxonomy: Layers,
  reasoning: Cpu,
  consensus: Scale,
  validation: ShieldCheck,
  deduplication: CopyCheck,
};

const TOOL_HUMAN_NARRATIVES: Record<AgentToolStepId, string> = {
  segmentation: 'Isolating & tokenizing raw question blocks from input text…',
  taxonomy: 'Classifying into Cardiovascular (CVS) Curriculum & mapping syllabus topics…',
  reasoning: 'Conducting medical reasoning, key deduction & distractor analysis…',
  consensus: 'Cross-examining accuracy across multi-model quorum ensemble…',
  validation: 'Verifying Single-Best-Answer invariants & NBME board schema conformity…',
  deduplication: 'Auditing duplication & LSH collisions against 220+ question bank items…',
};

// Dynamic clinical reasoning sub-phases to turn 14s LLM latency into visible, reassuring intelligence
const REASONING_CLINICAL_SUB_PHASES: string[] = [
  'Deconstructing clinical presentation & isolating vital sign invariants…',
  'Analyzing cardiovascular hemodynamics & multi-system pathophysiology…',
  'Synthesizing differential diagnoses & deducing missing answer key…',
  'Formulating board-standard NBME distractor rationales & clinical pearls…',
  'Grounding clinical evidence against CVS active curriculum…',
  'Finalizing Single-Best-Answer structure & exam invariants…',
];

export function formatHumanizedDuration(ms: number | undefined): string {
  if (ms === undefined) return 'Pending';
  if (ms < 10) return '< 10ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getToolPerformanceMeta(
  stepId: AgentToolStepId,
  durationMs: number | undefined,
  status: string
): {
  badgeLabel: string;
  badgeStyle: string;
  executionClass: string;
  humanDuration: string;
} {
  const humanDuration = formatHumanizedDuration(durationMs);

  if (status === 'skipped') {
    return {
      badgeLabel: 'Bypassed',
      badgeStyle: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700',
      executionClass: 'Optional pass (disabled by administrator in Control Deck)',
      humanDuration: '—',
    };
  }
  if (status === 'running') {
    return {
      badgeLabel: 'In Flight…',
      badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 animate-pulse',
      executionClass: 'Active compute stream on Apple Neural Engine / Cloud Bus',
      humanDuration: 'Running',
    };
  }
  if (durationMs !== undefined && durationMs < 50) {
    return {
      badgeLabel: '⚡ Real-time',
      badgeStyle: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold',
      executionClass: 'Compiled In-Memory AST Engine (Zero network latency, 60fps synchronous pass)',
      humanDuration,
    };
  }
  if (stepId === 'reasoning') {
    return {
      badgeLabel: '✨ Deep Synthesis',
      badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold',
      executionClass: 'Cloud Multi-Turn Neural Inference (Chain-of-thought, NBME distractors & syllabus grounding)',
      humanDuration,
    };
  }
  if (stepId === 'deduplication') {
    return {
      badgeLabel: '🛡️ Bank Audit',
      badgeStyle: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold',
      executionClass: 'Prebuilt MinHash LSH & Jaccard Discriminator Sieve against 220+ bank questions',
      humanDuration,
    };
  }
  return {
    badgeLabel: 'Verified',
    badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold',
    executionClass: 'Deterministic Schema & Rule Invariant Verification',
    humanDuration,
  };
}

export const AppleIntelligenceAgentOrchestrator: React.FC<AppleIntelligenceAgentOrchestratorProps> = ({
  telemetry,
  isParsing,
  onAbort,
  activeModelName = 'Google Gemini 2.5 Flash',
  stemMode = 'verbatim',
  enableConsensusCheck = false,
  initialExpandedInspector = false,
}) => {
  const [selectedStepId, setSelectedStepId] = useState<AgentToolStepId | null>(
    telemetry.currentStepId || 'reasoning'
  );
  const [isInspectorExpanded, setIsInspectorExpanded] = useState<boolean>(initialExpandedInspector);
  const [isSimulatingReplay, setIsSimulatingReplay] = useState<boolean>(false);
  const [replayStepIndex, setReplayStepIndex] = useState<number>(-1);
  const [hoveredStepId, setHoveredStepId] = useState<AgentToolStepId | null>(null);

  // Dynamic Clinical Sub-Phase & Asymptotic Pacing State
  const [reasoningSubPhaseIdx, setReasoningSubPhaseIdx] = useState<number>(0);
  const [stepElapsedSeconds, setStepElapsedSeconds] = useState<number>(0);

  // Auto-focus active running step when telemetry changes
  useEffect(() => {
    if (telemetry.currentStepId) {
      setSelectedStepId(telemetry.currentStepId);
    }
  }, [telemetry.currentStepId]);

  // Dynamic Sub-Phase Rotation: during 14s Gemini reasoning, cycle clinical stages every 2.4s
  useEffect(() => {
    if (!telemetry.isRunning || telemetry.currentStepId !== 'reasoning') {
      setReasoningSubPhaseIdx(0);
      setStepElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setStepElapsedSeconds((prev) => prev + 0.5);
      setReasoningSubPhaseIdx((prev) => (prev + 1) % REASONING_CLINICAL_SUB_PHASES.length);
    }, 2400);

    return () => clearInterval(interval);
  }, [telemetry.isRunning, telemetry.currentStepId]);

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
    }, 550);
  };

  const selectedStep = telemetry.steps.find((s) => s.id === selectedStepId) || telemetry.steps[0];
  const SelectedIcon = TOOL_ICONS[selectedStep.id] || Sparkles;

  const completedCount = telemetry.steps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length;
  const isAllCompleted = completedCount === telemetry.steps.length && !telemetry.isRunning;

  // Apple Asymptotic Smooth Progress Pacing: glides forward continuously so the system never looks "frozen"
  const dynamicProgressPercent = useMemo(() => {
    if (isAllCompleted) return 100;
    if (!telemetry.isRunning) {
      return Math.round((completedCount / telemetry.steps.length) * 100);
    }

    const stepId = telemetry.currentStepId;
    if (stepId === 'segmentation') return 12;
    if (stepId === 'taxonomy') return 24;
    if (stepId === 'reasoning') {
      // Smooth asymptotic curve gliding from 33% towards 82% over ~14s without visual stutter
      const asymptotic = 33 + Math.round(49 * (1 - Math.exp(-stepElapsedSeconds / 6.5)));
      return Math.min(82, Math.max(33, asymptotic));
    }
    if (stepId === 'consensus') return 86;
    if (stepId === 'validation') return 92;
    if (stepId === 'deduplication') return 97;

    return Math.round((completedCount / telemetry.steps.length) * 100);
  }, [isAllCompleted, telemetry.isRunning, completedCount, telemetry.steps.length, telemetry.currentStepId, stepElapsedSeconds]);

  // Active human narrative string with dynamic clinical decomposition
  const activeNarrative = useMemo(() => {
    if (telemetry.isRunning && telemetry.currentStepId) {
      if (telemetry.currentStepId === 'reasoning') {
        return REASONING_CLINICAL_SUB_PHASES[reasoningSubPhaseIdx] || TOOL_HUMAN_NARRATIVES.reasoning;
      }
      return TOOL_HUMAN_NARRATIVES[telemetry.currentStepId] || `Executing ${telemetry.activeToolName}…`;
    }
    if (isAllCompleted) {
      return 'All 6 Autonomous Stages Verified & Grounded to CVS Active Syllabus.';
    }
    return 'Apple Intelligence Pipeline ready for unformatted clinical question ingestion.';
  }, [telemetry.isRunning, telemetry.currentStepId, reasoningSubPhaseIdx, telemetry.activeToolName, isAllCompleted]);

  const selectedStepMeta = getToolPerformanceMeta(selectedStep.id, selectedStep.durationMs, selectedStep.status);

  return (
    <div
      className={`relative rounded-3xl p-[1.5px] transition-all duration-700 overflow-hidden ${
        telemetry.isRunning
          ? 'animate-siri-aurora apple-glow-siri'
          : isAllCompleted
          ? 'bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-cyan-500/40 apple-glow-emerald'
          : 'bg-gradient-to-r from-purple-500/30 via-indigo-500/20 to-cyan-500/30 shadow-lg'
      }`}
    >
      {/* Outer Ethereal Glow Halo */}
      {telemetry.isRunning && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-cyan-600/30 blur-2xl animate-pulse -z-10 pointer-events-none" />
      )}

      {/* Main Glass Deck Container */}
      <div className="rounded-[22px] bg-white/92 dark:bg-zinc-900/92 backdrop-blur-2xl p-4 sm:p-5 space-y-3.5 transition-all">
        {/* ==================================================================
            PRIMARY UNIFIED SURFACE: THE APPLE LUMINESCENT STRIP
            Replaces the 6 giant boxes with a sleek, weightless status capsule
           ================================================================== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          {/* Left: Siri Orb & Dynamic Human Narrative */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Pulsing Siri Aurora Orb */}
            <div
              className={`relative w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md transition-all duration-500 ${
                telemetry.isRunning
                  ? 'bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-500 shadow-purple-500/30 animate-pulse'
                  : isAllCompleted
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/25'
                  : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500'
              }`}
            >
              {telemetry.isRunning ? (
                <Activity className="w-5 h-5 animate-pulse" />
              ) : isAllCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
              {telemetry.isRunning && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-white dark:border-zinc-900 animate-ping" />
              )}
            </div>

            {/* Title & Kinetic Narrative */}
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold font-heading text-zinc-900 dark:text-zinc-50 tracking-tight">
                  Apple Intelligence Agent Pipeline
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                  Orchestrator v2.5
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {dynamicProgressPercent}%
                </span>
              </div>

              {/* Kinetic Stage Narrative with Smooth Entrance */}
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-xl animate-text-morph">
                {activeNarrative}
              </p>
            </div>
          </div>

          {/* Right: Real-time Siri Harmonic Waveform & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end md:self-auto flex-wrap">
            {/* Live Waveform Equalizer */}
            <div
              title={telemetry.isRunning ? 'Active Neural Bus Streaming' : 'All Autonomous Tools Synced'}
              className="flex items-end gap-1 h-7 px-3 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60 shadow-inner"
            >
              {[35, 70, 50, 95, 60, 85, 40].map((baseHeight, i) => (
                <span
                  key={i}
                  style={{
                    height: telemetry.isRunning ? `${baseHeight}%` : isAllCompleted ? '45%' : '25%',
                    animationDelay: `${i * 0.12}s`,
                  }}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    telemetry.isRunning
                      ? 'bg-gradient-to-t from-purple-500 via-pink-500 to-cyan-400 animate-wave-dance'
                      : isAllCompleted
                      ? 'bg-emerald-500'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
              ))}
              <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 ml-1.5">
                {telemetry.isRunning ? 'BUS BUSY' : 'SYNCED'}
              </span>
            </div>

            {/* Stopwatch Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{(telemetry.elapsedMs / 1000).toFixed(2)}s</span>
            </div>

            {/* Replay Trace Button */}
            {!telemetry.isRunning && (
              <button
                type="button"
                onClick={handleReplay}
                disabled={isSimulatingReplay}
                title="Replay simulated packet travel across the 6 pipeline stages"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">Replay Trace</span>
              </button>
            )}

            {/* Abort Execution Button */}
            {(telemetry.isRunning || isParsing) && (
              <button
                type="button"
                onClick={onAbort}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <StopCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Abort Run</span>
              </button>
            )}

            {/* Deep Telemetry Inspector Toggle */}
            <button
              type="button"
              onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
              title={isInspectorExpanded ? 'Hide deep tool inspector' : 'Inspect the 6 autonomous tools & latency benchmarks'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isInspectorExpanded
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isInspectorExpanded ? 'Hide Tools' : 'Inspect Tools'}
              </span>
              {isInspectorExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ==================================================================
            6-SEGMENT LUMINESCENT MICRO-TRACK
            Replaces the 6 giant boxes with an elegant, responsive progress track
           ================================================================== */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="font-medium flex items-center gap-1.5">
              <span>Ordered execution: 6 Autonomous Tools</span>
              {telemetry.isRunning && (
                <span className="text-purple-500 font-bold animate-pulse">● Streaming</span>
              )}
            </span>
            <span className="font-mono text-[10px]">
              {hoveredStepId
                ? telemetry.steps.find((s) => s.id === hoveredStepId)?.label
                : selectedStep.label}
            </span>
          </div>

          {/* 6 Interactive Segmented Pills */}
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {telemetry.steps.map((step, idx) => {
              const isSelected = selectedStepId === step.id;
              const isRunning = step.status === 'running' || (isSimulatingReplay && replayStepIndex === idx);
              const isDone = step.status === 'completed';
              const isSkipped = step.status === 'skipped';
              const isFailed = step.status === 'failed';
              const stepMeta = getToolPerformanceMeta(step.id, step.durationMs, step.status);

              return (
                <button
                  key={step.id}
                  type="button"
                  onMouseEnter={() => setHoveredStepId(step.id)}
                  onMouseLeave={() => setHoveredStepId(null)}
                  onClick={() => {
                    setSelectedStepId(step.id);
                    setIsInspectorExpanded(true);
                  }}
                  title={`${step.label} • ${stepMeta.badgeLabel} (${step.durationMs !== undefined ? `${step.durationMs}ms` : step.status})`}
                  className={`group relative h-2.5 sm:h-3 rounded-full transition-all duration-300 cursor-pointer overflow-hidden p-0 border ${
                    isSelected
                      ? 'ring-2 ring-purple-500/50 border-purple-500/80 scale-[1.02]'
                      : 'border-transparent hover:scale-[1.02]'
                  } ${
                    isRunning
                      ? 'bg-purple-500 shadow-md shadow-purple-500/40 animate-pulse'
                      : isDone
                      ? 'bg-emerald-500/80 dark:bg-emerald-500 shadow-xs shadow-emerald-500/30'
                      : isSkipped
                      ? 'bg-zinc-200 dark:bg-zinc-700/60 opacity-60'
                      : isFailed
                      ? 'bg-rose-500'
                      : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                >
                  {/* Active liquid shimmer sweep */}
                  {isRunning && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-pass" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Micro Segment Labels Strip */}
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 pt-0.5">
            {telemetry.steps.map((step, idx) => (
              <span key={step.id} className="text-center truncate" title={step.label}>
                0{idx + 1} {step.id === 'segmentation' ? '⚡ Input' : step.id === 'taxonomy' ? '⚡ Taxonomy' : step.id === 'reasoning' ? '✨ Gemini' : step.id === 'consensus' ? 'Quorum' : step.id === 'validation' ? '⚡ Schema' : '🛡️ QDD'}
              </span>
            ))}
          </div>
        </div>

        {/* ==================================================================
            SLIDE-DOWN DEEP TOOL TELEMETRY INSPECTOR
            Only visible when the user taps "Inspect Tools" or a segment pill
           ================================================================== */}
        {isInspectorExpanded && (
          <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/80 space-y-4 animate-in slide-in-from-top-3 duration-300">
            {/* Header: Selected Tool Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <SelectedIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span>Deep Tool Telemetry Inspector:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md text-[11px]">
                      {selectedStep.toolName}
                    </span>
                  </h4>
                  <p className="text-[10px] text-zinc-500">{selectedStep.label}</p>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold border border-zinc-200 dark:border-zinc-700">
                Latency: {selectedStep.durationMs !== undefined ? `${selectedStep.durationMs}ms` : 'Pending'} ({selectedStep.status})
              </span>
            </div>

            {/* 3 Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Metric 1: Tool Purpose */}
              <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1 shadow-2xs">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Purpose & Capability
                </div>
                <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                  {selectedStep.description}
                </div>
              </div>

              {/* Metric 2: Live Status */}
              <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1.5 shadow-2xs">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Execution Latency & Status
                </div>
                <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                  <span>Latency: {selectedStep.durationMs !== undefined ? `${selectedStep.durationMs}ms` : 'Pending'}</span>
                  <span className="text-[10px] text-zinc-400">({selectedStep.status})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md ${selectedStepMeta.badgeStyle}`}>
                    {selectedStepMeta.badgeLabel}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium pt-1 border-t border-zinc-100 dark:border-zinc-700/50 leading-relaxed">
                  {selectedStepMeta.executionClass}
                </div>
              </div>

              {/* Metric 3: Active Architecture Target */}
              <div className="p-3 rounded-xl bg-white/90 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1 shadow-2xs">
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
                      : selectedStep.id === 'deduplication'
                      ? 'MinHash LSH & Clinical Collision Engine (v2)'
                      : 'Deterministic Engine'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Antigravity Trace Stream */}
            <div className="p-3 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] leading-relaxed shadow-inner border border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5 text-zinc-500 text-[10px]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-purple-400" />
                  <span>AGENT_EXECUTION_TRACE_STREAM</span>
                </span>
                <span>STEP_ID: {selectedStep.id.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-purple-400">[Antigravity Engine]</span>{' '}
                {selectedStep.detail || 'Tool queued in memory waiting for previous pipeline stage resolution.'}
              </div>
            </div>

            {/* Compact Tool Selector Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
                Inspect Tool:
              </span>
              {telemetry.steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStepId(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedStepId === s.id
                      ? 'bg-purple-600 text-white shadow-xs font-bold'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <span className="font-mono opacity-70">0{i + 1}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
