import React, { useState, useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import type {
  HourlyEdgeTrafficPoint,
  TimeframeWindowId,
  TimezoneDisplayMode,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';
import {
  buildSmoothCubicPath,
  STUDY_PHASE_META,
  type ChartSeriesFilter,
  type SvgCoord,
} from './observabilityPortalUtils.ts';

interface ObservabilityMultiSpectralSplineChartProps {
  readonly activePoints: readonly HourlyEdgeTrafficPoint[];
  readonly activeTimeframe: TimeframeWindowId;
  readonly timezoneMode: TimezoneDisplayMode;
  readonly onQuickExportCsv: () => void;
}

export const ObservabilityMultiSpectralSplineChart: React.FC<
  ObservabilityMultiSpectralSplineChartProps
> = ({ activePoints, activeTimeframe, timezoneMode, onQuickExportCsv }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [chartSeriesFilter, setChartSeriesFilter] = useState<ChartSeriesFilter>('combined');

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

  return (
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
              {
                id: 'combined',
                label: 'All Layers (Dual-Axis)',
                color: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900',
              },
              {
                id: 'worker-requests',
                label: 'Worker Requests (Cyan)',
                color: 'bg-cyan-500 text-white',
              },
              {
                id: 'd1-rows',
                label: 'D1 Rows Streamed (Violet)',
                color: 'bg-violet-600 text-white',
              },
              {
                id: 'scholars',
                label: 'Active Scholars (Emerald)',
                color: 'bg-emerald-600 text-white',
              },
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
            onClick={onQuickExportCsv}
            data-testid="quick-chart-csv-export-btn"
            className="ml-1 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-500/20 active:scale-95 dark:text-emerald-300 cursor-pointer"
            title="Instant 1-Click Download of Hourly Time-Series CSV (Excel / Numbers / Pandas)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV ({activeTimeframe})</span>
          </button>
        </div>
      </div>

      {/* Live Inspected Hour HUD Ribbon */}
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
                ~{inspectedPoint.estimatedConcurrentScholars}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Proportional High-DPI SVG Chart */}
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
                  <text
                    x={chartGeometry.leftPad - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-cyan-600 dark:fill-cyan-400 text-[10px] font-bold"
                  >
                    {leftVal}
                  </text>
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
                const barW = Math.min(
                  26,
                  Math.max(12, chartGeometry.usableW / activePoints.length - 10)
                );
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
  );
};
