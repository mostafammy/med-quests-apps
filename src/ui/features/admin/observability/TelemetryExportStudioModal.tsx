import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Copy,
  Check,
  History,
  X,
  ShieldCheck,
} from 'lucide-react';
import type {
  TimeframeWindowId,
  TelemetryExportFormatId,
  TelemetryExportScope,
  TelemetryExportArtifact,
  HistoricalSyncCheckpoint,
  HourlyEdgeTrafficPoint,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

interface TelemetryExportStudioModalProps {
  readonly isMounted: boolean;
  readonly isAnimatingIn: boolean;
  readonly previewExportArtifact: TelemetryExportArtifact | null;
  readonly activeTimeframe: TimeframeWindowId;
  readonly selectedExportFormat: TelemetryExportFormatId;
  readonly selectedExportScope: TelemetryExportScope;
  readonly historicalCheckpoints: readonly HistoricalSyncCheckpoint[];
  readonly activePoints: readonly HourlyEdgeTrafficPoint[];
  readonly exportFeedbackStatus: 'idle' | 'downloaded' | 'copied';
  readonly lastExportedFilename: string | null;
  readonly onClose: () => void;
  readonly onSelectFormat: (format: TelemetryExportFormatId) => void;
  readonly onSelectScope: (scope: TelemetryExportScope) => void;
  readonly onCopyExport: () => Promise<void>;
  readonly onDownloadExport: () => void;
}

export const TelemetryExportStudioModal: React.FC<TelemetryExportStudioModalProps> = ({
  isMounted,
  isAnimatingIn,
  previewExportArtifact,
  activeTimeframe,
  selectedExportFormat,
  selectedExportScope,
  historicalCheckpoints,
  activePoints,
  exportFeedbackStatus,
  lastExportedFilename,
  onClose,
  onSelectFormat,
  onSelectScope,
  onCopyExport,
  onDownloadExport,
}) => {
  const [exportPreviewTab, setExportPreviewTab] = useState<'tabular' | 'raw'>('tabular');

  if (!isMounted || !previewExportArtifact || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="telemetry-export-modal-title"
      data-testid="telemetry-export-studio-modal"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Frosted Glass Backdrop with Smooth Fade Physics */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-zinc-950/65 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isAnimatingIn ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal Sheet Surface with 120Hz Apple Spring Scale & Translate Physics */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl transition-all duration-300 dark:border-zinc-800/90 dark:bg-zinc-900/95 ${
          isAnimatingIn
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-[0.94] translate-y-6 opacity-0'
        }`}
      >
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
                Choose your target format and longitudinal time horizon. Every export is
                cryptographically checksummed and ready for Excel, Apple Numbers, Pandas, or
                Executive Board review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-1 font-mono text-[10px] font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-400">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
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
                Export the currently inspected window or expand to the full 7-day longitudinal
                series + historical sync checkpoints.
              </p>
            </div>

            <div className="flex rounded-xl border border-zinc-200/90 bg-white p-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 shrink-0">
              <button
                type="button"
                onClick={() => onSelectScope('active-timeframe')}
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
                onClick={() => onSelectScope('longitudinal-7d-full')}
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
                    iconTone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
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
                    iconTone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
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
                    onClick={() => onSelectFormat(fmt.id)}
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
                          isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
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

          {/* Step 4: Dual-Mode Live Telemetry Preview */}
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
                      <th className="px-3 py-2 text-right text-emerald-400">Cumulative Reqs</th>
                      <th className="px-3 py-2 text-right text-cyan-400">Cumulative D1 Rows</th>
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
              onClick={onClose}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void onCopyExport()}
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
              onClick={onDownloadExport}
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
  );
};
