/**
 * @file LiveEdgeObservabilityPortal.tsx
 * @description Apple Design Award-grade Live Cloudflare Edge Observability & Cohort Intelligence Portal.
 *
 * Decomposed Subcomponents:
 * - ObservabilityExecutiveBentoGrid: Apple Watch Activity Rings, Worker Compute Plane, D1 Engine, Asset Cache Plane
 * - ObservabilityMultiSpectralSplineChart: 120Hz Catmull-Rom Cubic Spline & Bar Chart + Live Inspected Hour HUD
 * - ObservabilityCircadianAndSubseaTopology: 24-Hour Circadian Medical Study Rhythm + Subsea PoP Topology + Silicon Quantiles
 * - ObservabilityAiExecutiveCopilotDeck: Multi-Model AI Executive Telemetry Co-Pilot
 * - TelemetryExportStudioModal: ProMotion Fluid Spring Modal for CSV/JSON/Markdown Export
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  Key,
  ShieldCheck,
  Radio,
  Unlock,
  Download,
} from 'lucide-react';
import { useEdgeObservabilityStore } from '../../../../application/stores/useEdgeObservabilityStore.ts';
import { telemetryExportOrchestrator } from '../../../../domain/observability/telemetryExportEngine.ts';
import { QddObservabilityWidget } from './QddObservabilityWidget.tsx';
import { ObservabilityExecutiveBentoGrid } from './ObservabilityExecutiveBentoGrid.tsx';
import { ObservabilityMultiSpectralSplineChart } from './ObservabilityMultiSpectralSplineChart.tsx';
import { ObservabilityCircadianAndSubseaTopology } from './ObservabilityCircadianAndSubseaTopology.tsx';
import { ObservabilityAiExecutiveCopilotDeck } from './ObservabilityAiExecutiveCopilotDeck.tsx';
import { TelemetryExportStudioModal } from './TelemetryExportStudioModal.tsx';
import type {
  TimeframeWindowId,
  TelemetryExportFormatId,
  TelemetryExportScope,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

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

  const [isTokenDrawerOpen, setIsTokenDrawerOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState(customApiToken);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isExportModalMounted, setIsExportModalMounted] = useState(false);
  const [isExportModalAnimatingIn, setIsExportModalAnimatingIn] = useState(false);
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

  const { cohortEstimate, coloDistribution } = snapshot;

  return (
    <div className="space-y-6 animate-fade-in pb-14">
      {/* 1. APPLE COMMAND CENTER HEADER & LIVE SYNC TELEMETRY BAR */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-white via-zinc-50/90 to-cyan-50/30 p-6 shadow-md backdrop-blur-xl dark:border-zinc-800/90 dark:from-zinc-900 dark:via-zinc-900/95 dark:to-zinc-950">
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
              Unified real-time Anycast edge invocations, D1 SQLite question throughput, submarine
              fiber routing, and biostatistical reach across your{' '}
              <span className="font-bold text-zinc-900 dark:text-zinc-100 underline decoration-amber-500/60 underline-offset-4">
                {cohortEstimate.targetBatchSize}-Scholar Medical Batch
              </span>
              .
            </p>
          </div>

          {/* Right Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
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

            <button
              type="button"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                autoRefreshEnabled
                  ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 shadow-xs dark:text-emerald-300'
                  : 'border border-zinc-200/90 bg-white text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Radio
                className={`h-3.5 w-3.5 ${
                  autoRefreshEnabled ? 'animate-pulse text-emerald-500' : ''
                }`}
              />
              <span>{autoRefreshEnabled ? 'Live Polling (30s)' : 'Auto-Poll Off'}</span>
            </button>

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

        {/* LIVE 4-STAGE PROMOTION SYNC PROGRESS & CONNECTION DIAGNOSTIC STRIP */}
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
                  Your portal is <strong>already connected and authenticated automatically</strong>{' '}
                  via your local Cloudflare CLI OAuth session and Worker D1 database bindings. You
                  do <strong>not</strong> need to generate or paste any token. The input box on the
                  right is strictly an <em>optional override</em> if you ever want to inspect a
                  separate Cloudflare account.
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

      {/* QDD Engine Live Observability & Free-Tier Neuron Monitor */}
      <QddObservabilityWidget />

      {/* 2. EXECUTIVE BENTO GRID & INTERACTIVE APPLE WATCH ACTIVITY RINGS */}
      <ObservabilityExecutiveBentoGrid
        snapshot={snapshot}
        targetBatchSize={targetBatchSize}
        onChangeTargetBatchSize={setTargetBatchSize}
      />

      {/* 3. MULTI-SPECTRAL INTERACTIVE HOURLY TRAFFIC & D1 SPLINE CHART */}
      <ObservabilityMultiSpectralSplineChart
        activePoints={activePoints}
        activeTimeframe={activeTimeframe}
        timezoneMode={timezoneMode}
        onQuickExportCsv={() => handleDownloadExport('csv-timeseries', 'active-timeframe')}
      />

      {/* 4 & 5. 24-HOUR CIRCADIAN HEATMAP + SUBSEA CABLE & ANYCAST COLO TOPOLOGY */}
      <ObservabilityCircadianAndSubseaTopology
        activePoints={activePoints}
        coloDistribution={coloDistribution}
      />

      {/* 6. AI EXECUTIVE TELEMETRY CO-PILOT COMMAND DECK */}
      <ObservabilityAiExecutiveCopilotDeck
        activeAiLens={activeAiLens}
        selectedAiProvider={selectedAiProvider}
        aiBriefing={aiBriefing}
        isAiSynthesizing={isAiSynthesizing}
        onChangeAiProvider={setSelectedAiProvider}
        onChangeAiLens={setActiveAiLens}
        onSynthesizeBriefing={() => void synthesizeAiBriefing()}
      />

      {/* 7. APPLE PROMOTION FLUID SPRING MODAL: TELEMETRY EXPORT STUDIO */}
      <TelemetryExportStudioModal
        isMounted={isExportModalMounted}
        isAnimatingIn={isExportModalAnimatingIn}
        previewExportArtifact={previewExportArtifact}
        activeTimeframe={activeTimeframe}
        selectedExportFormat={selectedExportFormat}
        selectedExportScope={selectedExportScope}
        historicalCheckpoints={historicalCheckpoints}
        activePoints={activePoints}
        exportFeedbackStatus={exportFeedbackStatus}
        lastExportedFilename={lastExportedFilename}
        onClose={closeExportModal}
        onSelectFormat={setSelectedExportFormat}
        onSelectScope={setSelectedExportScope}
        onCopyExport={handleCopyExport}
        onDownloadExport={() => handleDownloadExport()}
      />
    </div>
  );
};
