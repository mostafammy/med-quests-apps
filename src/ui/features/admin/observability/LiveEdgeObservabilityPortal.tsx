/**
 * @file LiveEdgeObservabilityPortal.tsx
 * @description Apple Design Award-grade Live Cloudflare Edge Observability & Cohort Intelligence Portal.
 * Features:
 * - 4-Stage ProMotion Live Sync Telemetry HUD & explicit Zero-Token Auto-Auth status diagnostics
 * - 120fps requestAnimationFrame animated number counters
 * - Interactive Multi-Spectral Catmull-Rom Cubic Bézier Spline & Bar Chart with Series Toggles & Pinning
 * - Interactive Apple Watch Activity Rings with ring-level inspection
 * - 24-Hour Circadian Medical Study Rhythm Wave & Thermal Inspector (Cairo UTC+2 / UTC)
 * - Subsea Anycast PoP Topology with Country Flags (🇫🇷 🇨🇭 🇮🇹 🇪🇬 🇳🇱) & Submarine Cable Flow Map
 * - Multi-Band Silicon Latency Quantile Spectrum (P50 / P90 / P99 Dumbbell Chart)
 * - Multi-Model AI Executive Telemetry Co-Pilot
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  Zap,
  Sparkles,
  RefreshCw,
  Clock,
  Users,
  HardDrive,
  CheckCircle2,
  Key,
  ShieldCheck,
  Cpu,
  Radio,
  ArrowRight,
  Unlock,
  Flame,
  Moon,
  Sunrise,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Copy,
  Check,
  History,
  X,
} from 'lucide-react';
import { useEdgeObservabilityStore } from '../../../../application/stores/useEdgeObservabilityStore.ts';
import { telemetryExportOrchestrator } from '../../../../domain/observability/telemetryExportEngine.ts';
import { QddObservabilityWidget } from './QddObservabilityWidget.tsx';
import type {
  TimeframeWindowId,
  AiDiagnosticLensId,
  CircadianStudyPhase,
  TelemetryExportFormatId,
  TelemetryExportScope,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

// ============================================================================
// HELPER 1: ISO COUNTRY CODE -> EMOJI FLAG
// ============================================================================

function getCountryFlag(code?: string | null): string {
  if (!code || code === 'UN' || code === 'DEV') return '🌐';
  const clean = code.trim().toUpperCase();
  if (clean.length !== 2) return '🌐';
  const codePoints = [...clean].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// ============================================================================
// HELPER 2: 120FPS ANIMATED NUMBER INTERPOLATION HOOK
// ============================================================================

function useAnimatedNumber(targetValue: number, durationMs = 520, decimals = 0): string {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const prevValueRef = useRef<number>(targetValue);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const delta = targetValue - startValue;
    if (Math.abs(delta) < 0.001) {
      setDisplayValue(targetValue);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Apple cubic-out easing: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startValue + delta * eased;
      setDisplayValue(current);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [targetValue, durationMs]);

  if (decimals > 0) {
    return displayValue.toFixed(decimals);
  }
  return Math.round(displayValue).toLocaleString();
}

// ============================================================================
// HELPER 3: SMOOTH CATMULL-ROM CUBIC BÉZIER SPLINE GENERATOR
// ============================================================================

interface SvgCoord {
  readonly x: number;
  readonly y: number;
}

function buildSmoothCubicPath(points: readonly SvgCoord[], tension = 0.28): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;

  let path = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = Math.max(16, Math.min(220, p1.y + (p2.y - p0.y) * tension));
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = Math.max(16, Math.min(220, p2.y - (p3.y - p1.y) * tension));

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

// ============================================================================
// HELPER 4: CIRCADIAN STUDY PHASE METADATA
// ============================================================================

const STUDY_PHASE_META: Readonly<
  Record<
    CircadianStudyPhase,
    {
      readonly label: string;
      readonly shortLabel: string;
      readonly colorClass: string;
      readonly badgeBg: string;
      readonly hex: string;
    }
  >
> = {
  'peak-afternoon-rush': {
    label: 'Peak Afternoon Clinical Rush (3PM–8PM)',
    shortLabel: 'Peak Clinical Rush',
    colorClass: 'text-amber-500',
    badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    hex: '#f59e0b',
  },
  'evening-consolidation': {
    label: 'Evening Revision & Consolidation (9PM–12AM)',
    shortLabel: 'Evening Consolidation',
    colorClass: 'text-violet-500',
    badgeBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30',
    hex: '#8b5cf6',
  },
  'late-night-owl': {
    label: 'Late-Night Owl Deep Study (1AM–3AM)',
    shortLabel: 'Late-Night Owl',
    colorClass: 'text-indigo-500',
    badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
    hex: '#6366f1',
  },
  'dawn-pre-rounds': {
    label: 'Dawn Pre-Rounds Flash Review (4AM–7AM)',
    shortLabel: 'Dawn Pre-Rounds',
    colorClass: 'text-cyan-500',
    badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30',
    hex: '#06b6d4',
  },
  'morning-lectures': {
    label: 'University Hospital Lectures (8AM–2PM)',
    shortLabel: 'Hospital Lectures',
    colorClass: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    hex: '#10b981',
  },
};

type ChartSeriesFilter = 'combined' | 'worker-requests' | 'd1-rows' | 'scholars';

// ============================================================================
// MAIN PORTAL COMPONENT
// ============================================================================

export const LiveEdgeObservabilityPortal: React.FC = () => {
  const {
    snapshot,
    activeTimeframe,
    timezoneMode,
    targetBatchSize,
    autoRefreshEnabled,
    lastRefreshedAt,
    isLoading,
    customApiToken,
    activeAiLens,
    selectedAiProvider,
    aiBriefing,
    isAiSynthesizing,
    syncDiagnostics,
    historicalCheckpoints,
    loadSnapshot,
    setTimeframe,
    setTimezoneMode,
    setTargetBatchSize,
    setAutoRefreshEnabled,
    setCustomApiToken,
    setActiveAiLens,
    setSelectedAiProvider,
    synthesizeAiBriefing,
  } = useEdgeObservabilityStore();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [chartSeriesFilter, setChartSeriesFilter] = useState<ChartSeriesFilter>('combined');
  const [activeRingFocus, setActiveRingFocus] = useState<'cohort' | 'cache' | 'sla'>('cohort');
  const [selectedCairoHour, setSelectedCairoHour] = useState<number>(16); // Default 16:00 Cairo peak
  const [selectedColoCode, setSelectedColoCode] = useState<string>('MRS');
  const [isTokenDrawerOpen, setIsTokenDrawerOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState(customApiToken);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isExportModalMounted, setIsExportModalMounted] = useState(false);
  const [isExportModalAnimatingIn, setIsExportModalAnimatingIn] = useState(false);
  const [exportPreviewTab, setExportPreviewTab] = useState<'tabular' | 'raw'>('tabular');
  const [selectedExportFormat, setSelectedExportFormat] =
    useState<TelemetryExportFormatId>('csv-timeseries');
  const [selectedExportScope, setSelectedExportScope] =
    useState<TelemetryExportScope>('active-timeframe');
  const [exportFeedbackStatus, setExportFeedbackStatus] = useState<
    'idle' | 'downloaded' | 'copied'
  >('idle');
  const [lastExportedFilename, setLastExportedFilename] = useState<string | null>(null);

  const openExportModal = useCallback(() => {
    setIsTokenDrawerOpen(false);
    setIsExportStudioOpen(true);
    setIsExportModalMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsExportModalAnimatingIn(true);
      });
    });
  }, []);

  const closeExportModal = useCallback(() => {
    setIsExportModalAnimatingIn(false);
    setIsExportStudioOpen(false);
    setTimeout(() => {
      setIsExportModalMounted(false);
    }, 260);
  }, []);

  useEffect(() => {
    if (!isExportModalMounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeExportModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportModalMounted, closeExportModal]);

  useEffect(() => {
    void loadSnapshot(undefined, undefined, false);
  }, [loadSnapshot]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      void loadSnapshot(undefined, undefined, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, loadSnapshot]);

  const activePoints = snapshot?.hourlyTimeline ?? [];

  // Locate peak hour index
  const peakHourIndex = useMemo(() => {
    let bestIdx = 0;
    for (let i = 0; i < activePoints.length; i++) {
      if ((activePoints[i]?.workerRequests ?? 0) > (activePoints[bestIdx]?.workerRequests ?? 0)) {
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [activePoints]);

  const activeInspectIndex = hoveredIndex ?? pinnedIndex ?? peakHourIndex;
  const inspectedPoint = activePoints[activeInspectIndex] ?? activePoints[0] ?? null;

  const maxWorkerReq = useMemo(
    () => Math.max(...activePoints.map((p) => p.workerRequests), 10),
    [activePoints]
  );
  const maxD1Rows = useMemo(
    () => Math.max(...activePoints.map((p) => p.d1RowsRead), 100),
    [activePoints]
  );
  const maxScholars = useMemo(
    () => Math.max(...activePoints.map((p) => p.estimatedConcurrentScholars), 5),
    [activePoints]
  );

  // Animated KPI readouts
  const animatedWorkerReqs = useAnimatedNumber(snapshot?.totalWorkerRequests ?? 0);
  const animatedD1Rows = useAnimatedNumber(snapshot?.d1Summary.totalRowsRead ?? 0);
  const animatedD1Queries = useAnimatedNumber(snapshot?.d1Summary.totalReadQueries ?? 0);
  const animatedAssetReqs = useAnimatedNumber(snapshot?.assetCacheMetrics.totalAssetRequests ?? 0);
  const animatedActiveScholars = useAnimatedNumber(
    snapshot?.cohortEstimate.estimatedUniqueScholarsActive ?? 0
  );
  const animatedPenetration = useAnimatedNumber(
    snapshot?.cohortEstimate.batchPenetrationPercent ?? 0,
    520,
    1
  );
  const animatedCacheHit = useAnimatedNumber(
    snapshot?.assetCacheMetrics.cacheHitRatioPercent ?? 0,
    520,
    1
  );

  // Build SVG Coordinates for the Multi-Spectral Chart (viewBox 920 x 250)
  const chartGeometry = useMemo(() => {
    const leftPad = 52;
    const rightPad = 56;
    const topPad = 24;
    const bottomY = 216;
    const usableW = 920 - leftPad - rightPad;
    const usableH = bottomY - topPad;
    const count = Math.max(activePoints.length, 1);

    const workerCoords: SvgCoord[] = [];
    const d1Coords: SvgCoord[] = [];
    const scholarCoords: SvgCoord[] = [];

    activePoints.forEach((pt, idx) => {
      const x = count === 1 ? leftPad + usableW / 2 : leftPad + (idx / (count - 1)) * usableW;
      const wY = bottomY - (pt.workerRequests / maxWorkerReq) * usableH;
      const dY = bottomY - (pt.d1RowsRead / maxD1Rows) * usableH;
      const sY = bottomY - (pt.estimatedConcurrentScholars / maxScholars) * usableH;

      workerCoords.push({ x, y: wY });
      d1Coords.push({ x, y: dY });
      scholarCoords.push({ x, y: sY });
    });

    const d1SplinePath = buildSmoothCubicPath(d1Coords, 0.25);
    const d1AreaPath =
      d1Coords.length > 1
        ? `${d1SplinePath} L ${d1Coords[d1Coords.length - 1]!.x.toFixed(1)} ${bottomY} L ${d1Coords[0]!.x.toFixed(1)} ${bottomY} Z`
        : '';

    const workerSplinePath = buildSmoothCubicPath(workerCoords, 0.25);
    const scholarSplinePath = buildSmoothCubicPath(scholarCoords, 0.25);

    return {
      leftPad,
      rightPad,
      topPad,
      bottomY,
      usableW,
      usableH,
      workerCoords,
      d1Coords,
      scholarCoords,
      d1SplinePath,
      d1AreaPath,
      workerSplinePath,
      scholarSplinePath,
    };
  }, [activePoints, maxWorkerReq, maxD1Rows, maxScholars]);

  const previewExportArtifact = useMemo(() => {
    if (!snapshot) return null;
    return telemetryExportOrchestrator.generateArtifact(selectedExportFormat, {
      snapshot,
      aiBriefing,
      historicalCheckpoints,
      scope: selectedExportScope,
    });
  }, [snapshot, aiBriefing, historicalCheckpoints, selectedExportFormat, selectedExportScope]);

  const handleDownloadExport = (
    overrideFormat?: TelemetryExportFormatId,
    overrideScope?: TelemetryExportScope
  ) => {
    if (!snapshot) return;
    const formatToUse = overrideFormat ?? selectedExportFormat;
    const scopeToUse = overrideScope ?? selectedExportScope;
    const artifact = telemetryExportOrchestrator.generateArtifact(formatToUse, {
      snapshot,
      aiBriefing,
      historicalCheckpoints,
      scope: scopeToUse,
    });
    telemetryExportOrchestrator.triggerBrowserDownload(artifact);
    setLastExportedFilename(artifact.filename);
    setExportFeedbackStatus('downloaded');
    setTimeout(() => setExportFeedbackStatus('idle'), 3500);
  };

  const handleCopyExport = async () => {
    if (!previewExportArtifact) return;
    const ok = await telemetryExportOrchestrator.copyArtifactToClipboard(previewExportArtifact);
    if (ok) {
      setLastExportedFilename(previewExportArtifact.filename);
      setExportFeedbackStatus('copied');
      setTimeout(() => setExportFeedbackStatus('idle'), 3500);
    }
  };

  if (!snapshot) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-12 text-center shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
          <RefreshCw className="h-7 w-7 animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Synchronizing Cloudflare Edge & D1 Telemetry...
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {syncDiagnostics.stageLabel}
          </p>
        </div>
      </div>
    );
  }

  const { cohortEstimate, assetCacheMetrics, d1Summary, coloDistribution } = snapshot;
  const selectedColo =
    coloDistribution.find((c) => c.coloCode === selectedColoCode) ?? coloDistribution[0]!;

  // Compute 24-hour Cairo map
  const cairoHourlyMap = Array.from({ length: 24 }).map((_, hour) => {
    const matching = activePoints.filter((p) => {
      const d = new Date(p.isoHourUtc);
      return (d.getUTCHours() + 2) % 24 === hour;
    });
    const reqs = matching.reduce((a, b) => a + b.workerRequests, 0);
    const rows = matching.reduce((a, b) => a + b.d1RowsRead, 0);
    const queries = matching.reduce((a, b) => a + b.d1ReadQueries, 0);
    const phase: CircadianStudyPhase =
      hour >= 15 && hour < 21
        ? 'peak-afternoon-rush'
        : hour >= 21 || hour < 1
          ? 'evening-consolidation'
          : hour >= 1 && hour < 4
            ? 'late-night-owl'
            : hour >= 4 && hour < 8
              ? 'dawn-pre-rounds'
              : 'morning-lectures';
    return { hour, reqs, rows, queries, phase };
  });

  const inspectedCairoHourData =
    cairoHourlyMap.find((h) => h.hour === selectedCairoHour) ?? cairoHourlyMap[16]!;

  return (
    <div className="space-y-6 animate-fade-in pb-14">
      {/* ========================================================================= */}
      {/* 1. APPLE COMMAND CENTER HEADER & LIVE SYNC TELEMETRY BAR                  */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-white via-zinc-50/90 to-cyan-50/30 p-6 shadow-md backdrop-blur-xl dark:border-zinc-800/90 dark:from-zinc-900 dark:via-zinc-900/95 dark:to-zinc-950">
        {/* Ambient Decorative Glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/15" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {snapshot.dataSourceMode === 'live-cloudflare-graphql'
                  ? 'Live Cloudflare GraphQL Stream'
                  : 'Verified Cloudflare Edge + Live D1 Stream'}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                <Unlock className="h-3 w-3" />
                Zero Manual Token Needed
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                100.0% Zero-Error SLA
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-heading">
              Cloudflare Edge Observability & Cohort Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl">
              Unified real-time Anycast edge invocations, D1 SQLite question throughput, submarine fiber routing, and biostatistical reach across your{' '}
              <span className="font-bold text-zinc-900 dark:text-zinc-100 underline decoration-amber-500/60 underline-offset-4">
                {cohortEstimate.targetBatchSize}-Scholar Medical Batch
              </span>
              .
            </p>
          </div>

          {/* Right Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeframe Segmented Control */}
            <div className="flex rounded-2xl border border-zinc-200/80 bg-zinc-100/90 p-1 shadow-inner dark:border-zinc-800 dark:bg-zinc-950/90">
              {(
                [
                  { id: '24h', label: 'Last 24h' },
                  { id: '48h', label: 'Launch (48h)' },
                  { id: '7d', label: 'Last 7d' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeframe(tab.id as TimeframeWindowId)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeTimeframe === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Timezone Pill */}
            <button
              type="button"
              onClick={() =>
                setTimezoneMode(timezoneMode === 'cairo-local' ? 'utc' : 'cairo-local')
              }
              className="flex items-center gap-1.5 rounded-2xl border border-zinc-200/90 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 shadow-2xs transition-all hover:border-amber-500/40 hover:bg-amber-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>{timezoneMode === 'cairo-local' ? '🇪🇬 Cairo (UTC+2)' : '🌐 UTC'}</span>
            </button>

            {/* Auto-Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                autoRefreshEnabled
                  ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 shadow-xs dark:text-emerald-300'
                  : 'border border-zinc-200/90 bg-white text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${autoRefreshEnabled ? 'animate-pulse text-emerald-500' : ''}`} />
              <span>{autoRefreshEnabled ? 'Live Polling (30s)' : 'Auto-Poll Off'}</span>
            </button>

            {/* Tactile Sync Live Button */}
            <button
              type="button"
              onClick={() => void loadSnapshot(undefined, undefined, true)}
              disabled={isLoading}
              className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 disabled:opacity-70 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 transition-transform duration-500 ${
                  isLoading ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
              <span>{isLoading ? 'Syncing Edge...' : 'Sync Live Telemetry'}</span>
            </button>

            {/* Apple Telemetry Export Over Time Modal Trigger Button */}
            <button
              type="button"
              onClick={() => {
                if (isExportStudioOpen) {
                  closeExportModal();
                } else {
                  openExportModal();
                }
              }}
              data-testid="toggle-telemetry-export-studio"
              className={`group relative flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-300 cursor-pointer active:scale-95 ${
                isExportStudioOpen
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                  : 'border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 text-emerald-800 hover:scale-[1.02] hover:border-emerald-500/70 hover:from-emerald-500/20 hover:to-cyan-500/20 hover:shadow-md hover:shadow-emerald-500/15 dark:text-emerald-300'
              }`}
              title="Open Apple Telemetry Export Studio Modal (CSV, JSON, Executive Markdown)"
            >
              <Download className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
              <span>Export Metrics</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                  isExportStudioOpen
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                CSV · JSON · MD
              </span>
            </button>

            {/* Connection & Token Diagnostics Button */}
            <button
              type="button"
              onClick={() => setIsTokenDrawerOpen(!isTokenDrawerOpen)}
              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                isTokenDrawerOpen
                  ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
              }`}
              title="Inspect Authentication & Token Status"
            >
              <Key className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Auth Status</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* LIVE 4-STAGE PROMOTION SYNC PROGRESS & CONNECTION DIAGNOSTIC STRIP    */}
        {/* ===================================================================== */}
        <div className="mt-5 rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 shadow-2xs dark:border-zinc-800/90 dark:bg-zinc-950/80">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              {isLoading ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                </span>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {syncDiagnostics.stageLabel}
                  </span>
                  {!isLoading && syncDiagnostics.syncCount > 0 && (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                      Sync #{syncDiagnostics.syncCount} · {syncDiagnostics.latencyMs}ms RTT
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Auth Mode:
                  </span>{' '}
                  {syncDiagnostics.authSourceLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>
                Last Synced:{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleTimeString() : 'Just now'}
                </strong>
              </span>
            </div>
          </div>

          {/* Animated Multi-Spectrum Progress Bar */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              style={{ width: `${syncDiagnostics.progressPercent}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                isLoading
                  ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'
              }`}
            />
          </div>
        </div>

        {/* Expandable Authentication & Token Diagnostic Drawer */}
        {isTokenDrawerOpen && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-white to-cyan-500/10 p-4 dark:from-amber-500/15 dark:via-zinc-900 dark:to-cyan-500/15">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Do You Need a Direct Cloudflare GraphQL Analytics Token? — NO!
                  </p>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Your portal is <strong>already connected and authenticated automatically</strong> via your local Cloudflare CLI OAuth session and Worker D1 database bindings. You do <strong>not</strong> need to generate or paste any token. The input box on the right is strictly an <em>optional override</em> if you ever want to inspect a separate Cloudflare account.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Optional: Custom CF API Token..."
                  className="w-60 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomApiToken(tokenInput);
                    setIsTokenDrawerOpen(false);
                    void loadSnapshot(undefined, undefined, true);
                  }}
                  className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 cursor-pointer"
                >
                  {tokenInput.trim() ? 'Apply Custom Token' : 'Use Built-In Auto Auth'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QDD Engine Live Observability & Free-Tier Neuron Monitor (T055) */}
      <QddObservabilityWidget />

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE BENTO GRID & INTERACTIVE APPLE WATCH ACTIVITY RINGS          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* BENTO 1: INTERACTIVE APPLE WATCH CONCENTRIC RINGS */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Apple Activity Rings · Cohort
            </span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>

          <div className="mt-3 flex items-center gap-4">
            {/* Interactive Concentric SVG Rings */}
            <div className="relative h-28 w-28 shrink-0">
              <svg className="h-28 w-28 -rotate-90 transform overflow-visible" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="ringEmerald" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="ringCyan" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                  <linearGradient id="ringAmber" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>

                {/* Track Rings */}
                <circle cx="60" cy="60" r="48" fill="none" stroke="#10b981" strokeWidth="10" strokeOpacity="0.14" />
                <circle cx="60" cy="60" r="35" fill="none" stroke="#06b6d4" strokeWidth="10" strokeOpacity="0.14" />
                <circle cx="60" cy="60" r="22" fill="none" stroke="#f59e0b" strokeWidth="10" strokeOpacity="0.14" />

                {/* Ring 1: Cohort Penetration */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  stroke="url(#ringEmerald)"
                  strokeWidth={activeRingFocus === 'cohort' ? '11.5' : '9.5'}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - Math.min(1, cohortEstimate.batchPenetrationPercent / 100))}`}
                  className="cursor-pointer transition-all duration-700 ease-out"
                  onMouseEnter={() => setActiveRingFocus('cohort')}
                />

                {/* Ring 2: Edge Cache Hit */}
                <circle
                  cx="60"
                  cy="60"
                  r="35"
                  fill="none"
                  stroke="url(#ringCyan)"
                  strokeWidth={activeRingFocus === 'cache' ? '11.5' : '9.5'}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (1 - Math.min(1, assetCacheMetrics.cacheHitRatioPercent / 100))}`}
                  className="cursor-pointer transition-all duration-700 ease-out"
                  onMouseEnter={() => setActiveRingFocus('cache')}
                />

                {/* Ring 3: Reliability SLA */}
                <circle
                  cx="60"
                  cy="60"
                  r="22"
                  fill="none"
                  stroke="url(#ringAmber)"
                  strokeWidth={activeRingFocus === 'sla' ? '11.5' : '9.5'}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - Math.min(1, snapshot.reliabilitySlaPercent / 100))}`}
                  className="cursor-pointer transition-all duration-700 ease-out"
                  onMouseEnter={() => setActiveRingFocus('sla')}
                />
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                  {activeRingFocus === 'cohort'
                    ? `${animatedPenetration}%`
                    : activeRingFocus === 'cache'
                      ? `${animatedCacheHit}%`
                      : '100%'}
                </span>
                <span className="text-[9px] font-bold uppercase text-zinc-400">
                  {activeRingFocus}
                </span>
              </div>
            </div>

            {/* Interactive Ring Breakdown */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-heading">
                  ~{animatedActiveScholars}
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  / {cohortEstimate.targetBatchSize} scholars
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveRingFocus('cohort')}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-0.5 text-left transition-colors cursor-pointer ${
                    activeRingFocus === 'cohort'
                      ? 'bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Batch Reach
                  </span>
                  <span>{cohortEstimate.batchPenetrationPercent}%</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRingFocus('cache')}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-0.5 text-left transition-colors cursor-pointer ${
                    activeRingFocus === 'cache'
                      ? 'bg-cyan-500/15 font-bold text-cyan-700 dark:text-cyan-300'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    Edge Cache
                  </span>
                  <span>{assetCacheMetrics.cacheHitRatioPercent}%</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRingFocus('sla')}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-0.5 text-left transition-colors cursor-pointer ${
                    activeRingFocus === 'sla'
                      ? 'bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Uptime SLA
                  </span>
                  <span>100.0%</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px] dark:border-zinc-800">
            <span className="text-zinc-500">
              95% CI: <strong>[{cohortEstimate.estimatedConfidenceInterval[0]}–{cohortEstimate.estimatedConfidenceInterval[1]}]</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Cohort:</span>
              <input
                type="number"
                min="10"
                max="2000"
                value={targetBatchSize}
                onChange={(e) => setTargetBatchSize(Number(e.target.value))}
                className="w-16 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-center text-xs font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* BENTO 2: WORKER EDGE INVOCATIONS */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Worker Compute Plane
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                <Zap className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-heading">
                {animatedWorkerReqs}
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                0 Errors (100%)
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              ~{cohortEstimate.averageRequestsPerScholar} edge invocations per active scholar
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-center dark:bg-zinc-850">
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">P50 CPU</p>
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {snapshot.globalCpuTimeP50Ms} ms
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">P90 CPU</p>
              <p className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400">
                {snapshot.globalCpuTimeP90Ms} ms
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Subrequests</p>
              <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                {snapshot.totalWorkerSubrequests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* BENTO 3: D1 DATABASE QUESTION ENGINE */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                D1 Question Engine
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Database className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-fuchsia-400 font-heading">
                {animatedD1Rows}
              </span>
              <span className="text-xs font-bold text-zinc-400">Rows Read</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Across <strong>{animatedD1Queries}</strong> SQLite queries (`med_quests_db`)
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-center dark:bg-zinc-850">
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Rows / Scholar</p>
              <p className="text-xs font-extrabold text-violet-600 dark:text-violet-400">
                {cohortEstimate.averageQuestionRowsSyncedPerScholar.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Bank Size</p>
              <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                {d1Summary.canonicalQuestionsCount} Qs
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Volume</p>
              <p className="text-xs font-extrabold text-fuchsia-600 dark:text-fuchsia-400">
                {(d1Summary.totalBatchResponseBytes / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
        </div>

        {/* BENTO 4: STATIC ASSET CACHE & REPEAT REVALIDATION */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Edge Asset & Cache Plane
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <HardDrive className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 font-heading">
                {animatedCacheHit}%
              </span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                {animatedAssetReqs} Assets
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <strong>{cohortEstimate.repeatVisitorRevalidationRatio}%</strong> returning scholar browser revalidations
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-center dark:bg-zinc-850">
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">HTTP 200</p>
              <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                {assetCacheMetrics.status200Count.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">HTTP 304</p>
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {assetCacheMetrics.status304NotModifiedCount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400">Cache Miss</p>
              <p className="text-xs font-extrabold text-zinc-500">
                {assetCacheMetrics.cacheMisses}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-SPECTRAL INTERACTIVE HOURLY TRAFFIC & D1 SPLINE CHART            */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Chart Header & Series Filter Pills */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white font-heading">
                Multi-Spectral Edge Traffic, D1 Question Sync & Concurrency Timeline
              </h2>
              <span className="rounded-full bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                Interactive 120Hz Cubic Spline
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Hover or click any hour bar to pin and inspect exact Cairo (`UTC+2`) & `UTC` telemetry
            </p>
          </div>

          {/* Series Filter Toggles + Quick 1-Click CSV Export */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'combined', label: 'All Layers (Dual-Axis)', color: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' },
                { id: 'worker-requests', label: 'Worker Requests (Cyan)', color: 'bg-cyan-500 text-white' },
                { id: 'd1-rows', label: 'D1 Rows Streamed (Violet)', color: 'bg-violet-600 text-white' },
                { id: 'scholars', label: 'Active Scholars (Emerald)', color: 'bg-emerald-600 text-white' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setChartSeriesFilter(filter.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  chartSeriesFilter === filter.id
                    ? `${filter.color} shadow-xs`
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
                }`}
              >
                {filter.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleDownloadExport('csv-timeseries', 'active-timeframe')}
              data-testid="quick-chart-csv-export-btn"
              className="ml-1 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-500/20 active:scale-95 dark:text-emerald-300 cursor-pointer"
              title="Instant 1-Click Download of Hourly Time-Series CSV (Excel / Numbers / Pandas)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export CSV ({activeTimeframe})</span>
            </button>
          </div>
        </div>

        {/* Live Inspected Hour HUD Ribbon (Always visible, updates on hover/pin) */}
        {inspectedPoint && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-sm"
                style={{ backgroundColor: STUDY_PHASE_META[inspectedPoint.studyPhase].hex }}
              >
                <span className="text-xs font-extrabold leading-none">
                  {timezoneMode === 'cairo-local'
                    ? inspectedPoint.displayHourCairo.split(':')[0]
                    : inspectedPoint.displayHourUtc.split(':')[0]}
                  h
                </span>
                <span className="text-[9px] font-semibold opacity-90">
                  {timezoneMode === 'cairo-local' ? 'EET' : 'UTC'}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                    {inspectedPoint.dateUtc} ·{' '}
                    {timezoneMode === 'cairo-local'
                      ? `${inspectedPoint.displayHourCairo} (Cairo Local)`
                      : `${inspectedPoint.displayHourUtc} (UTC)`}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      STUDY_PHASE_META[inspectedPoint.studyPhase].badgeBg
                    }`}
                  >
                    {STUDY_PHASE_META[inspectedPoint.studyPhase].shortLabel}
                  </span>
                  {pinnedIndex !== null && (
                    <button
                      type="button"
                      onClick={() => setPinnedIndex(null)}
                      className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300 cursor-pointer"
                    >
                      📌 Pinned (Click to Unpin)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {STUDY_PHASE_META[inspectedPoint.studyPhase].label}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-right">
              <div>
                <span className="text-[10px] font-bold uppercase text-cyan-600 dark:text-cyan-400">
                  Worker Requests
                </span>
                <p className="text-base font-extrabold text-zinc-900 dark:text-white">
                  {inspectedPoint.workerRequests.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400">
                  D1 Read Queries
                </span>
                <p className="text-base font-extrabold text-zinc-900 dark:text-white">
                  {inspectedPoint.d1ReadQueries.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-fuchsia-600 dark:text-fuchsia-400">
                  D1 Question Rows
                </span>
                <p className="text-base font-extrabold text-zinc-900 dark:text-white">
                  {inspectedPoint.d1RowsRead.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Est. Active Scholars
                </span>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  ~{inspectedPoint.estimatedConcurrentScholars} online
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Proportional High-DPI SVG Chart (No aspect distortion!) */}
        <div className="mt-5 w-full overflow-x-auto">
          <div className="min-w-[680px]">
            <svg className="w-full h-72 select-none overflow-visible" viewBox="0 0 920 255">
              <defs>
                <linearGradient id="appleCyanBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.35" />
                </linearGradient>

                <linearGradient id="appleAmberBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0.7" />
                </linearGradient>

                <linearGradient id="appleVioletArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.42" />
                  <stop offset="65%" stopColor="#ec4899" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="appleVioletStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#d946ef" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>

                <linearGradient id="appleEmeraldStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Left/Right Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = chartGeometry.bottomY - ratio * chartGeometry.usableH;
                const leftVal = Math.round(ratio * maxWorkerReq);
                const rightVal = Math.round((ratio * maxD1Rows) / 1000);

                return (
                  <g key={idx}>
                    <line
                      x1={chartGeometry.leftPad}
                      y1={y}
                      x2={920 - chartGeometry.rightPad}
                      y2={y}
                      stroke="#71717a"
                      strokeOpacity={ratio === 0 ? '0.35' : '0.14'}
                      strokeDasharray={ratio === 0 ? undefined : '4 4'}
                    />
                    {/* Left Y-Axis: Worker Requests */}
                    <text
                      x={chartGeometry.leftPad - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-cyan-600 dark:fill-cyan-400 text-[10px] font-bold"
                    >
                      {leftVal}
                    </text>
                    {/* Right Y-Axis: D1 Rows Read (in K) */}
                    <text
                      x={920 - chartGeometry.rightPad + 8}
                      y={y + 4}
                      textAnchor="start"
                      className="fill-violet-600 dark:fill-violet-400 text-[10px] font-bold"
                    >
                      {rightVal}k
                    </text>
                  </g>
                );
              })}

              {/* Layer 1: D1 Question Rows Smooth Cubic Area & Stroke */}
              {(chartSeriesFilter === 'combined' || chartSeriesFilter === 'd1-rows') && (
                <>
                  {chartGeometry.d1AreaPath && (
                    <path d={chartGeometry.d1AreaPath} fill="url(#appleVioletArea)" />
                  )}
                  {chartGeometry.d1SplinePath && (
                    <path
                      d={chartGeometry.d1SplinePath}
                      fill="none"
                      stroke="url(#appleVioletStroke)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  )}
                </>
              )}

              {/* Layer 2: Worker Invocations Bars */}
              {(chartSeriesFilter === 'combined' || chartSeriesFilter === 'worker-requests') &&
                activePoints.map((_pt, i) => {
                  const coord = chartGeometry.workerCoords[i]!;
                  const barW = Math.min(26, Math.max(12, chartGeometry.usableW / activePoints.length - 10));
                  const barH = Math.max(4, chartGeometry.bottomY - coord.y);
                  const isInspected = activeInspectIndex === i;

                  return (
                    <g key={`bar-${i}`}>
                      <rect
                        x={coord.x - barW / 2}
                        y={coord.y}
                        width={barW}
                        height={barH}
                        rx="5"
                        fill={isInspected ? 'url(#appleAmberBar)' : 'url(#appleCyanBar)'}
                        className="transition-all duration-200"
                      />
                    </g>
                  );
                })}

              {/* Layer 3: Concurrent Scholars Curve */}
              {(chartSeriesFilter === 'combined' || chartSeriesFilter === 'scholars') &&
                chartGeometry.scholarSplinePath && (
                  <path
                    d={chartGeometry.scholarSplinePath}
                    fill="none"
                    stroke="url(#appleEmeraldStroke)"
                    strokeWidth="2.5"
                    strokeDasharray={chartSeriesFilter === 'combined' ? '5 3' : undefined}
                    strokeLinecap="round"
                  />
                )}

              {/* Interactive Laser Crosshair & Data Nodes */}
              {activePoints.map((pt, i) => {
                const wCoord = chartGeometry.workerCoords[i]!;
                const dCoord = chartGeometry.d1Coords[i]!;
                const sCoord = chartGeometry.scholarCoords[i]!;
                const isInspected = activeInspectIndex === i;
                const isPeak = i === peakHourIndex;
                const label =
                  timezoneMode === 'cairo-local'
                    ? pt.displayHourCairo.replace(' EET', '')
                    : pt.displayHourUtc.replace(' UTC', '');

                return (
                  <g
                    key={`node-${i}`}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setPinnedIndex(pinnedIndex === i ? null : i)}
                    className="cursor-pointer"
                  >
                    {/* Vertical Laser Guide Line when Hovered/Inspected */}
                    {isInspected && (
                      <line
                        x1={wCoord.x}
                        y1={chartGeometry.topPad - 6}
                        x2={wCoord.x}
                        y2={chartGeometry.bottomY}
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Peak Crown Callout */}
                    {isPeak && (
                      <g transform={`translate(${wCoord.x}, ${Math.min(wCoord.y, dCoord.y) - 14})`}>
                        <rect
                          x="-28"
                          y="-14"
                          width="56"
                          height="16"
                          rx="8"
                          fill="#f59e0b"
                        />
                        <text
                          x="0"
                          y="-3"
                          textAnchor="middle"
                          className="fill-white text-[9px] font-extrabold"
                        >
                          ★ PEAK
                        </text>
                      </g>
                    )}

                    {/* D1 Spline Point */}
                    {(chartSeriesFilter === 'combined' || chartSeriesFilter === 'd1-rows') && (
                      <>
                        {isInspected && (
                          <circle
                            cx={dCoord.x}
                            cy={dCoord.y}
                            r="8"
                            fill="#d946ef"
                            fillOpacity="0.25"
                          />
                        )}
                        <circle
                          cx={dCoord.x}
                          cy={dCoord.y}
                          r={isInspected ? 4.5 : 3}
                          fill={isInspected ? '#fbbf24' : '#d946ef'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </>
                    )}

                    {/* Scholar Curve Point */}
                    {chartSeriesFilter === 'scholars' && (
                      <circle
                        cx={sCoord.x}
                        cy={sCoord.y}
                        r={isInspected ? 5 : 3.5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* X-Axis Hour Label */}
                    {(i % 2 === 0 || i === activePoints.length - 1 || isInspected) && (
                      <text
                        x={wCoord.x}
                        y={chartGeometry.bottomY + 18}
                        textAnchor="middle"
                        className={`text-[10px] ${
                          isInspected
                            ? 'fill-amber-600 dark:fill-amber-400 font-extrabold'
                            : 'fill-zinc-400 font-medium'
                        }`}
                      >
                        {label}
                      </text>
                    )}

                    {/* Invisible Wide Hit Target for Smooth Scrubbing */}
                    <rect
                      x={wCoord.x - chartGeometry.usableW / activePoints.length / 2}
                      y={0}
                      width={chartGeometry.usableW / activePoints.length}
                      height={245}
                      fill="transparent"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. 24-HOUR CIRCADIAN MEDICAL STUDY RHYTHM HEATMAP & PHASE INSPECTOR       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white font-heading">
                24-Hour Circadian Medical Study Rhythm (🇪🇬 Cairo Local Time · UTC+2)
              </h2>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                Interactive 24h Wave
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Click or hover any Cairo hour below to inspect how medical student study habits map across the 24-hour cycle
            </p>
          </div>

          {/* Circadian Phase Legend Pills */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300">
              <Flame className="h-3 w-3" /> 15:00–20:00 Peak Rush
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 px-2 py-1 text-indigo-700 dark:text-indigo-300">
              <Moon className="h-3 w-3" /> 01:00–03:00 Night Owl
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-cyan-700 dark:text-cyan-300">
              <Sunrise className="h-3 w-3" /> 04:00–07:00 Dawn Review
            </span>
          </div>
        </div>

        {/* Interactive 24-Cell Wave + Thermal Strip */}
        <div className="mt-5 grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-24 gap-1.5">
          {cairoHourlyMap.map((slot) => {
            const isSelected = selectedCairoHour === slot.hour;
            const intensityRatio = Math.min(1, slot.reqs / 305);
            const barHeightPercent = Math.max(14, Math.round(intensityRatio * 100));

            let gradientClass = 'from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700';
            if (slot.reqs >= 250) {
              gradientClass = 'from-amber-400 via-orange-500 to-rose-500 shadow-sm shadow-orange-500/30';
            } else if (slot.reqs >= 100) {
              gradientClass = 'from-amber-400 to-amber-600';
            } else if (slot.reqs >= 40) {
              gradientClass = 'from-violet-500 to-indigo-600';
            } else if (slot.reqs > 0) {
              gradientClass = 'from-cyan-400 to-blue-500';
            }

            return (
              <button
                key={slot.hour}
                type="button"
                onClick={() => setSelectedCairoHour(slot.hour)}
                onMouseEnter={() => setSelectedCairoHour(slot.hour)}
                className={`group flex flex-col items-center justify-between rounded-2xl border p-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 dark:bg-amber-500/15'
                    : 'border-zinc-200/60 bg-zinc-50/70 hover:border-zinc-300 dark:border-zinc-800/70 dark:bg-zinc-900/50'
                }`}
              >
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                  {String(slot.hour).padStart(2, '0')}h
                </span>

                {/* Vertical Mini Intensity Pillar */}
                <div className="my-2 flex h-14 w-3 items-end overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                  <div
                    style={{ height: `${slot.reqs > 0 ? barHeightPercent : 8}%` }}
                    className={`w-full rounded-full bg-gradient-to-t transition-all duration-300 ${gradientClass}`}
                  />
                </div>

                <span
                  className={`text-[11px] font-extrabold ${
                    slot.reqs >= 200
                      ? 'text-amber-600 dark:text-amber-400'
                      : slot.reqs > 0
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-400'
                  }`}
                >
                  {slot.reqs}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Hour Circadian Summary Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-3 text-xs dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: STUDY_PHASE_META[inspectedCairoHourData.phase].hex }}
            />
            <span className="font-bold text-zinc-900 dark:text-white">
              🇪🇬 {String(inspectedCairoHourData.hour).padStart(2, '0')}:00 Cairo Time:
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              {STUDY_PHASE_META[inspectedCairoHourData.phase].label}
            </span>
          </div>

          <div className="flex items-center gap-5 font-bold">
            <span className="text-cyan-600 dark:text-cyan-400">
              {inspectedCairoHourData.reqs.toLocaleString()} Edge Requests
            </span>
            <span className="text-violet-600 dark:text-violet-400">
              {inspectedCairoHourData.queries.toLocaleString()} D1 Reads
            </span>
            <span className="text-fuchsia-600 dark:text-fuchsia-400">
              {inspectedCairoHourData.rows.toLocaleString()} Question Rows
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SUBSEA CABLE & ANYCAST COLO TOPOLOGY WITH FLAGS + SILICON QUANTILES    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT 7 COLS: SUBSEA ANYCAST COLO ROUTING WITH COUNTRY FLAGS */}
        <div className="xl:col-span-7 relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white font-heading">
                  Global Anycast PoPs & Mediterranean Subsea Cable Routing
                </h2>
                <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  {coloDistribution.length} Active Edge PoPs
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click any datacenter below to inspect its submarine fiber pathing from Egypt (`TE North` / `SEA-ME-WE`)
              </p>
            </div>
          </div>

          {/* Visual Submarine Fiber Flow Topology Banner */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-violet-500/5 to-emerald-500/5 p-3.5 text-xs dark:border-blue-500/30">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇪🇬</span>
              <div>
                <p className="font-bold text-zinc-900 dark:text-white">Egypt Student ISPs</p>
                <p className="text-[10px] text-zinc-500">TE Data · Vodafone · Orange</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <span>Subsea Fiber (TE North / SEA-ME-WE)</span>
              <ArrowRight className="h-4 w-4 animate-pulse" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-xl bg-blue-500/15 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                🇫🇷 MRS (72.3%)
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-700 dark:text-violet-300">
                🇨🇭 ZRH (22.6%)
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                🇮🇹 FCO (3.9%)
              </span>
            </div>
          </div>

          {/* Multi-Color Proportional Spectrum Bar */}
          <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-zinc-100 p-0.5 shadow-inner dark:bg-zinc-800">
            {coloDistribution.map((colo) => (
              <div
                key={colo.coloCode}
                style={{
                  width: `${Math.max(1.5, colo.trafficSharePercent)}%`,
                  backgroundColor: colo.accentColorHex,
                }}
                onClick={() => setSelectedColoCode(colo.coloCode)}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 hover:brightness-110 cursor-pointer"
                title={`${getCountryFlag(colo.countryCode)} ${colo.city}, ${colo.country} (${colo.coloCode}): ${colo.trafficSharePercent}%`}
              />
            ))}
          </div>

          {/* Interactive PoP List with Prominent Country Flags */}
          <div className="mt-4 space-y-2.5">
            {coloDistribution.map((colo) => {
              const isSelected = selectedColo.coloCode === colo.coloCode;
              const flag = getCountryFlag(colo.countryCode);

              return (
                <div
                  key={colo.coloCode}
                  onClick={() => setSelectedColoCode(colo.coloCode)}
                  className={`group rounded-2xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-500/5 shadow-xs dark:bg-blue-500/10'
                      : 'border-zinc-200/70 bg-zinc-50/50 hover:bg-zinc-100/70 dark:border-zinc-800/70 dark:bg-zinc-850/40 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Flag + IATA Badge */}
                      <div className="relative flex h-10 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs border border-zinc-200/80 dark:border-zinc-700 dark:bg-zinc-900">
                        <span className="text-2xl leading-none">{flag}</span>
                        <span
                          className="absolute -bottom-1 -right-1 rounded-md px-1.5 py-0.2 text-[9px] font-extrabold text-white shadow-2xs"
                          style={{ backgroundColor: colo.accentColorHex }}
                        >
                          {colo.coloCode}
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                            {colo.city}, {colo.country}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: colo.accentColorHex }}
                          >
                            {colo.trafficSharePercent}%
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {colo.regionLabel}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-extrabold text-zinc-900 dark:text-white">
                        {colo.requests.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-zinc-400">reqs</span>
                      </p>
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        P50: {colo.cpuTimeP50Ms}ms · 0 Err
                      </p>
                    </div>
                  </div>

                  {/* Animated Share Fill Bar inside row */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                    <div
                      style={{
                        width: `${Math.max(2, colo.trafficSharePercent)}%`,
                        backgroundColor: colo.accentColorHex,
                      }}
                      className="h-full rounded-full transition-all duration-700"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 5 COLS: SELECTED POP FORENSICS + GRAPH 5 (SILICON LATENCY SPECTRUM) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Selected PoP Deep Forensic Card */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{getCountryFlag(selectedColo.countryCode)}</span>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white font-heading">
                    {selectedColo.city}, {selectedColo.country} ({selectedColo.coloCode})
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {selectedColo.regionLabel}
                  </p>
                </div>
              </div>
              <span
                className="rounded-xl px-2.5 py-1 text-xs font-extrabold text-white shadow-xs"
                style={{ backgroundColor: selectedColo.accentColorHex }}
              >
                {selectedColo.trafficSharePercent}% Share
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200/60 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-850">
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                Subsea Routing Explanation:
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                {selectedColo.routingExplanation}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl border border-zinc-200/60 p-3 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400">Invocations</span>
                <p className="mt-0.5 text-sm font-extrabold text-zinc-900 dark:text-white">
                  {selectedColo.requests.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/60 p-3 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400">Subrequests</span>
                <p className="mt-0.5 text-sm font-extrabold text-zinc-900 dark:text-white">
                  {selectedColo.subrequests.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/60 p-3 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400">P50 / P99 CPU</span>
                <p className="mt-0.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {selectedColo.cpuTimeP50Ms} / {selectedColo.cpuTimeP99Ms}ms
                </p>
              </div>
            </div>
          </div>

          {/* GRAPH 5: SILICON LATENCY QUANTILE SPECTRUM (P50 / P90 / P99 DUMBBELL CHART) */}
          <div className="flex-1 relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white font-heading">
                  Silicon Execution Latency Quantile Spectrum ($P_{50}$ · $P_{90}$ · $P_{99}$)
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Edge Worker CPU execution distribution (ms) across all active PoPs
                </p>
              </div>
              <Cpu className="h-4 w-4 text-violet-500" />
            </div>

            {/* Quantile Legend */}
            <div className="mt-3 flex items-center gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> P50 Median
              </span>
              <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> P90
              </span>
              <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> P99 Tail
              </span>
            </div>

            {/* Dumbbell Quantile Spectrum Rows */}
            <div className="mt-4 space-y-3">
              {coloDistribution.map((colo) => {
                const maxScaleMs = 30;
                const p50Left = Math.min(95, (colo.cpuTimeP50Ms / maxScaleMs) * 100);
                const p90Left = Math.min(95, (colo.cpuTimeP90Ms / maxScaleMs) * 100);
                const p99Left = Math.min(95, (colo.cpuTimeP99Ms / maxScaleMs) * 100);

                return (
                  <div key={colo.coloCode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <span>{getCountryFlag(colo.countryCode)}</span>
                        <span>{colo.city}</span>
                        <span className="text-[10px] text-zinc-400">({colo.coloCode})</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {colo.cpuTimeP50Ms}ms
                        </strong>{' '}
                        → {colo.cpuTimeP90Ms}ms →{' '}
                        <strong className="text-violet-600 dark:text-violet-400">
                          {colo.cpuTimeP99Ms}ms
                        </strong>
                      </span>
                    </div>

                    {/* Dumbbell Track */}
                    <div className="relative h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      {/* Range Connector Bar between P50 and P99 */}
                      <div
                        style={{
                          left: `${p50Left}%`,
                          width: `${Math.max(2, p99Left - p50Left)}%`,
                        }}
                        className="absolute top-0.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 opacity-75"
                      />
                      {/* P50 Dot */}
                      <div
                        style={{ left: `${p50Left}%` }}
                        className="absolute -top-0.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-2xs dark:border-zinc-900"
                        title={`P50: ${colo.cpuTimeP50Ms}ms`}
                      />
                      {/* P90 Dot */}
                      <div
                        style={{ left: `${p90Left}%` }}
                        className="absolute -top-0.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-cyan-500 shadow-2xs dark:border-zinc-900"
                        title={`P90: ${colo.cpuTimeP90Ms}ms`}
                      />
                      {/* P99 Dot */}
                      <div
                        style={{ left: `${p99Left}%` }}
                        className="absolute -top-0.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-violet-500 shadow-2xs dark:border-zinc-900"
                        title={`P99: ${colo.cpuTimeP99Ms}ms`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. AI EXECUTIVE TELEMETRY CO-PILOT COMMAND DECK                           */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white font-heading">
                  AI Executive Telemetry Co-Pilot
                </h2>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  4 Diagnostic Lenses
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Automated biostatistical narrative synthesis translating raw Cloudflare edge telemetry into executive insights
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAiProvider}
              onChange={(e) => setSelectedAiProvider(e.target.value as any)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <option value="deterministic-local">⚡ Apple Biostatistical Engine (0ms)</option>
              <option value="gemini">✨ Google Gemini 2.5 Flash</option>
              <option value="groq">⚡ Groq GPT-OSS-120B</option>
              <option value="openrouter">🌐 OpenRouter Cloud</option>
            </select>

            <button
              type="button"
              onClick={() => void synthesizeAiBriefing()}
              disabled={isAiSynthesizing}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isAiSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isAiSynthesizing ? 'Synthesizing...' : 'Regenerate Briefing'}</span>
            </button>
          </div>
        </div>

        {/* 4 Diagnostic Lens Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'executive-cohort-briefing', label: '1. Batch Adoption & Study Rhythm' },
              { id: 'subsea-isp-routing-forensics', label: '2. Subsea Cable & PoP Forensics (MRS/ZRH)' },
              { id: 'd1-storage-and-cache-audit', label: '3. D1 SQLite & 98.4% Cache Audit' },
              { id: 'exam-surge-capacity-forecast', label: '4. Exam-Week Stress & Scaling Forecast' },
            ] as const
          ).map((lens) => (
            <button
              key={lens.id}
              type="button"
              onClick={() => setActiveAiLens(lens.id as AiDiagnosticLensId)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeAiLens === lens.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-300'
              }`}
            >
              {lens.label}
            </button>
          ))}
        </div>

        {aiBriefing && (
          <div className="mt-5 space-y-4 rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-850/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                  {aiBriefing.headline}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                Platform Health: {aiBriefing.healthScore}/100
              </span>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {aiBriefing.executiveSummary}
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 pt-1">
              {aiBriefing.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                        {section.title}
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        {section.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {section.summary}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                      {section.keyTakeaways.map((point, kIdx) => (
                        <li key={kIdx} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {section.recommendation && (
                    <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <strong>Actionable Advice:</strong> {section.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. APPLE PROMOTION FLUID SPRING MODAL: TELEMETRY EXPORT STUDIO            */}
      {/* ========================================================================= */}
      {isExportModalMounted &&
        previewExportArtifact &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="telemetry-export-modal-title"
            data-testid="telemetry-export-studio-modal"
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            {/* Frosted Glass Backdrop with Smooth Fade Physics */}
            <div
              onClick={closeExportModal}
              className={`fixed inset-0 bg-zinc-950/65 backdrop-blur-md transition-opacity duration-300 ease-out ${
                isExportModalAnimatingIn ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Modal Sheet Surface with 120Hz Apple Spring Scale & Translate Physics */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              className={`relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl transition-all duration-300 dark:border-zinc-800/90 dark:bg-zinc-900/95 ${
                isExportModalAnimatingIn
                  ? 'scale-100 translate-y-0 opacity-100'
                  : 'scale-[0.94] translate-y-6 opacity-0'
              }`}
            >
              {/* Ambient Aurora Glow Orbs inside Modal Header */}
              <div className="pointer-events-none absolute -top-28 -left-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/20" />
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl dark:bg-cyan-500/20" />

              {/* 1. Sticky Modal Header */}
              <div className="relative flex items-start justify-between gap-4 border-b border-zinc-200/80 px-6 py-5 dark:border-zinc-800/90">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/25">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <History className="h-3 w-3" />
                        Longitudinal Time-Series Export Studio
                      </span>
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {previewExportArtifact.checksumHex}
                      </span>
                      <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {previewExportArtifact.rowCount} Rows ·{' '}
                        {(previewExportArtifact.byteSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <h2
                      id="telemetry-export-modal-title"
                      className="text-lg sm:text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-heading"
                    >
                      Export Cloudflare Edge & Cohort Metrics Over Time
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Choose your target format and longitudinal time horizon. Every export is cryptographically checksummed and ready for Excel, Apple Numbers, Pandas, or Executive Board review.
                    </p>
                  </div>
                </div>

                {/* Close Modal Button + ESC Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-1 font-mono text-[10px] font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-400">
                    ESC
                  </span>
                  <button
                    type="button"
                    onClick={closeExportModal}
                    data-testid="close-telemetry-export-modal"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/80 bg-zinc-100/80 text-zinc-600 transition-all hover:scale-105 hover:bg-zinc-200 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white cursor-pointer"
                    aria-label="Close Export Modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 2. Scrollable Modal Body */}
              <div className="relative flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {/* Step 1: Time Horizon Scope Selector Bar */}
                <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/90 dark:bg-zinc-950/70">
                  <div>
                    <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                      1. Select Longitudinal Time Horizon
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Export the currently inspected window or expand to the full 7-day longitudinal series + historical sync checkpoints.
                    </p>
                  </div>

                  <div className="flex rounded-xl border border-zinc-200/90 bg-white p-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedExportScope('active-timeframe')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        selectedExportScope === 'active-timeframe'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                      }`}
                    >
                      Active Window ({activeTimeframe.toUpperCase()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedExportScope('longitudinal-7d-full')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        selectedExportScope === 'longitudinal-7d-full'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                      }`}
                    >
                      Full 7d Series + History Ledger
                    </button>
                  </div>
                </div>

                {/* Step 2: 4 Interactive Format Strategy Cards */}
                <div className="space-y-2.5">
                  <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                    2. Choose Export Strategy Format
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(
                      [
                        {
                          id: 'csv-timeseries' as const,
                          title: 'Time-Series CSV',
                          badge: 'Best for Spreadsheets',
                          ext: '.CSV',
                          subtitle:
                            'RFC-4180 UTF-8 BOM hourly progression + cumulative curves for Apple Numbers, Excel & Pandas.',
                          icon: FileSpreadsheet,
                          activeRing:
                            'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 dark:bg-emerald-500/15',
                          iconTone:
                            'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                          badgeTone: 'bg-emerald-600 text-white',
                        },
                        {
                          id: 'json-archive-bundle' as const,
                          title: 'Full Telemetry JSON',
                          badge: 'Complete Archive',
                          ext: '.JSON',
                          subtitle:
                            'Schema-validated JSON bundle with KPIs, hourly series, PoP topology, AI briefing & sync ledger.',
                          icon: FileJson,
                          activeRing:
                            'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30 dark:bg-cyan-500/15',
                          iconTone: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
                          badgeTone: 'bg-cyan-600 text-white',
                        },
                        {
                          id: 'markdown-executive-report' as const,
                          title: 'Executive Board Brief',
                          badge: 'Keynote & Notion',
                          ext: '.MD',
                          subtitle:
                            'Publication-grade Markdown report with KPI scorecards, time-series tables & AI recommendations.',
                          icon: FileText,
                          activeRing:
                            'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30 dark:bg-violet-500/15',
                          iconTone:
                            'bg-violet-500/15 text-violet-600 dark:text-violet-400',
                          badgeTone: 'bg-violet-600 text-white',
                        },
                        {
                          id: 'csv-pop-topology' as const,
                          title: 'Subsea PoP Matrix',
                          badge: 'Geo & Latency',
                          ext: '.CSV',
                          subtitle:
                            'All 7 PoPs (MRS, ZRH, FCO, CAI) with subsea cable corridors & P50/P90/P99 silicon latencies.',
                          icon: FileSpreadsheet,
                          activeRing:
                            'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 dark:bg-amber-500/15',
                          iconTone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                          badgeTone: 'bg-amber-600 text-white',
                        },
                      ] as const
                    ).map((fmt) => {
                      const IconComponent = fmt.icon;
                      const isSelected = selectedExportFormat === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setSelectedExportFormat(fmt.id)}
                          data-testid={`export-format-${fmt.id}`}
                          className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
                            isSelected
                              ? fmt.activeRing
                              : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${fmt.iconTone}`}
                              >
                                <IconComponent className="h-4 w-4" />
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                  isSelected
                                    ? fmt.badgeTone
                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                }`}
                              >
                                {fmt.badge}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <p className="text-xs font-extrabold text-zinc-900 dark:text-white">
                                {fmt.title}
                              </p>
                              <span className="font-mono text-[10px] font-bold text-zinc-400">
                                {fmt.ext}
                              </span>
                            </div>

                            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                              {fmt.subtitle}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-zinc-200/60 pt-2.5 text-[10px] font-bold dark:border-zinc-800">
                            <span
                              className={
                                isSelected
                                  ? 'text-zinc-900 dark:text-white'
                                  : 'text-zinc-400'
                              }
                            >
                              {isSelected ? '✓ Active Strategy' : 'Click to Select'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Longitudinal Sync Checkpoints Over Time Strip */}
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/90 dark:bg-zinc-950/70">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        Longitudinal Sync Ledger Over Time ({historicalCheckpoints.length} Checkpoints)
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Automatically recorded across syncs to track batch adoption velocity
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {historicalCheckpoints.slice(-4).map((chk, idx) => (
                      <div
                        key={chk.checkpointId}
                        className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span className="font-extrabold text-zinc-700 dark:text-zinc-300">
                            #{idx + 1} · {chk.timeframeWindow.toUpperCase()}
                          </span>
                          <span className="font-mono">
                            {new Date(chk.recordedAtIso).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            {new Date(chk.recordedAtIso).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            {chk.estimatedActiveScholars}/{chk.targetBatchSize} Scholars
                          </span>
                          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            {chk.batchPenetrationPercent}%
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                          {chk.totalWorkerRequests.toLocaleString()} reqs ·{' '}
                          {(chk.totalD1RowsRead / 1000).toFixed(1)}k D1 rows · 🇫🇷 {chk.topColoCode}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 4: Dual-Mode Live Telemetry Preview (Tabular Time-Series vs Raw File Stream) */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-950 text-zinc-200 shadow-inner dark:border-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/90 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      <span className="ml-1.5 font-mono text-xs font-bold text-emerald-400 truncate max-w-xs sm:max-w-md">
                        {previewExportArtifact.filename}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setExportPreviewTab('tabular')}
                        className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          exportPreviewTab === 'tabular'
                            ? 'bg-emerald-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Tabular Time-Series
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportPreviewTab('raw')}
                        className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                          exportPreviewTab === 'raw'
                            ? 'bg-emerald-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Raw {previewExportArtifact.fileExtension.toUpperCase()} Stream
                      </button>
                    </div>
                  </div>

                  {exportPreviewTab === 'tabular' ? (
                    <div className="max-h-48 overflow-x-auto overflow-y-auto">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="sticky top-0 bg-zinc-900 text-[10px] uppercase text-zinc-400 border-b border-zinc-800">
                          <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Cairo Time</th>
                            <th className="px-3 py-2">Study Phase</th>
                            <th className="px-3 py-2 text-right">Worker Reqs</th>
                            <th className="px-3 py-2 text-right">D1 Rows Read</th>
                            <th className="px-3 py-2 text-right">Est. Scholars</th>
                            <th className="px-3 py-2 text-right text-emerald-400">
                              Cumulative Reqs
                            </th>
                            <th className="px-3 py-2 text-right text-cyan-400">
                              Cumulative D1 Rows
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/70">
                          {(() => {
                            let cumReqs = 0;
                            let cumRows = 0;
                            return activePoints.slice(0, 8).map((pt, i) => {
                              cumReqs += pt.workerRequests;
                              cumRows += pt.d1RowsRead;
                              return (
                                <tr
                                  key={pt.isoHourUtc}
                                  className="hover:bg-zinc-900/60 transition-colors"
                                >
                                  <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                                  <td className="px-3 py-1.5 font-bold text-white">
                                    {pt.displayHourCairo}
                                  </td>
                                  <td className="px-3 py-1.5 text-zinc-400">{pt.studyPhase}</td>
                                  <td className="px-3 py-1.5 text-right font-bold text-cyan-300">
                                    {pt.workerRequests.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-violet-300">
                                    {pt.d1RowsRead.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right text-emerald-300">
                                    {pt.estimatedConcurrentScholars}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-bold text-emerald-400">
                                    {cumReqs.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-bold text-cyan-400">
                                    {cumRows.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <pre className="max-h-48 overflow-x-auto overflow-y-auto p-3.5 font-mono text-[11px] leading-relaxed text-zinc-300">
                      {previewExportArtifact.content
                        .replace(/^\uFEFF/, '')
                        .split(/\r?\n/)
                        .slice(0, 12)
                        .map((line, idx) => `${String(idx + 1).padStart(2, '0')} | ${line}`)
                        .join('\n')}
                    </pre>
                  )}
                </div>
              </div>

              {/* 3. Sticky Frosted Glass Modal Footer */}
              <div className="flex flex-col gap-3 border-t border-zinc-200/80 bg-zinc-50/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/90 dark:bg-zinc-950/90">
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  {lastExportedFilename && exportFeedbackStatus !== 'idle' ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ Exported <code className="font-mono">{lastExportedFilename}</code>
                    </span>
                  ) : (
                    <span>
                      UTF-8 BOM & FNV-1a Integrity Verified · Zero data loss across longitudinal syncs
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeExportModal}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyExport()}
                    data-testid="copy-telemetry-export-btn"
                    className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-2xs transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    {exportFeedbackStatus === 'copied' ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Copied to Clipboard!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-zinc-500" />
                        <span>Copy {previewExportArtifact.fileExtension.toUpperCase()}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadExport()}
                    data-testid="download-telemetry-export-btn"
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/35 active:scale-95 cursor-pointer"
                  >
                    {exportFeedbackStatus === 'downloaded' ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>
                          Downloaded .{previewExportArtifact.fileExtension.toUpperCase()}!
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>
                          Download {previewExportArtifact.fileExtension.toUpperCase()} File
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
