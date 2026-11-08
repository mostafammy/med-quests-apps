import React, { useState, useMemo } from 'react';
import { Flame, Moon, Sunrise, ArrowRight, Cpu } from 'lucide-react';
import type {
  HourlyEdgeTrafficPoint,
  EdgeColoNodeMetric,
  CircadianStudyPhase,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';
import { getCountryFlag, STUDY_PHASE_META } from './observabilityPortalUtils.ts';

interface ObservabilityCircadianAndSubseaTopologyProps {
  readonly activePoints: readonly HourlyEdgeTrafficPoint[];
  readonly coloDistribution: readonly EdgeColoNodeMetric[];
}

export const ObservabilityCircadianAndSubseaTopology: React.FC<
  ObservabilityCircadianAndSubseaTopologyProps
> = ({ activePoints, coloDistribution }) => {
  const [selectedCairoHour, setSelectedCairoHour] = useState<number>(16);
  const [selectedColoCode, setSelectedColoCode] = useState<string>('MRS');

  const selectedColo =
    coloDistribution.find((c) => c.coloCode === selectedColoCode) ?? coloDistribution[0]!;

  const cairoHourlyMap = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, hour) => {
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
      }),
    [activePoints]
  );

  const inspectedCairoHourData =
    cairoHourlyMap.find((h) => h.hour === selectedCairoHour) ?? cairoHourlyMap[16]!;

  return (
    <>
      {/* 4. 24-HOUR CIRCADIAN MEDICAL STUDY RHYTHM HEATMAP & PHASE INSPECTOR */}
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
              Click or hover any Cairo hour below to inspect how medical student study habits map
              across the 24-hour cycle
            </p>
          </div>

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

        <div className="mt-5 grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-24 gap-1.5">
          {cairoHourlyMap.map((slot) => {
            const isSelected = selectedCairoHour === slot.hour;
            const intensityRatio = Math.min(1, slot.reqs / 305);
            const barHeightPercent = Math.max(14, Math.round(intensityRatio * 100));

            let gradientClass = 'from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700';
            if (slot.reqs >= 250) {
              gradientClass =
                'from-amber-400 via-orange-500 to-rose-500 shadow-sm shadow-orange-500/30';
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

      {/* 5. SUBSEA CABLE & ANYCAST COLO TOPOLOGY WITH FLAGS + SILICON QUANTILES */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
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
                Click any datacenter below to inspect its submarine fiber pathing from Egypt (`TE
                North` / `SEA-ME-WE`)
              </p>
            </div>
          </div>

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

                    <div className="relative h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        style={{
                          left: `${p50Left}%`,
                          width: `${Math.max(2, p99Left - p50Left)}%`,
                        }}
                        className="absolute top-0.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 opacity-75"
                      />
                      <div
                        style={{ left: `${p50Left}%` }}
                        className="absolute -top-0.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-2xs dark:border-zinc-900"
                        title={`P50: ${colo.cpuTimeP50Ms}ms`}
                      />
                      <div
                        style={{ left: `${p90Left}%` }}
                        className="absolute -top-0.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-cyan-500 shadow-2xs dark:border-zinc-900"
                        title={`P90: ${colo.cpuTimeP90Ms}ms`}
                      />
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
    </>
  );
};
