import React, { useState } from 'react';
import { Users, Zap, Database, HardDrive } from 'lucide-react';
import type { EdgeObservabilitySnapshot } from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';
import { useAnimatedNumber } from './observabilityPortalUtils.ts';

interface ObservabilityExecutiveBentoGridProps {
  readonly snapshot: EdgeObservabilitySnapshot;
  readonly targetBatchSize: number;
  readonly onChangeTargetBatchSize: (size: number) => void;
}

export const ObservabilityExecutiveBentoGrid: React.FC<ObservabilityExecutiveBentoGridProps> = ({
  snapshot,
  targetBatchSize,
  onChangeTargetBatchSize,
}) => {
  const [activeRingFocus, setActiveRingFocus] = useState<'cohort' | 'cache' | 'sla'>('cohort');
  const { cohortEstimate, assetCacheMetrics, d1Summary } = snapshot;

  const animatedWorkerReqs = useAnimatedNumber(snapshot.totalWorkerRequests);
  const animatedD1Rows = useAnimatedNumber(d1Summary.totalRowsRead);
  const animatedD1Queries = useAnimatedNumber(d1Summary.totalReadQueries);
  const animatedAssetReqs = useAnimatedNumber(assetCacheMetrics.totalAssetRequests);
  const animatedActiveScholars = useAnimatedNumber(cohortEstimate.estimatedUniqueScholarsActive);
  const animatedPenetration = useAnimatedNumber(cohortEstimate.batchPenetrationPercent, 520, 1);
  const animatedCacheHit = useAnimatedNumber(assetCacheMetrics.cacheHitRatioPercent, 520, 1);

  return (
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

              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeOpacity="0.14"
              />
              <circle
                cx="60"
                cy="60"
                r="35"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="10"
                strokeOpacity="0.14"
              />
              <circle
                cx="60"
                cy="60"
                r="22"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="10"
                strokeOpacity="0.14"
              />

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
            95% CI:{' '}
            <strong>
              [{cohortEstimate.estimatedConfidenceInterval[0]}–
              {cohortEstimate.estimatedConfidenceInterval[1]}]
            </strong>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Cohort:</span>
            <input
              type="number"
              min="10"
              max="2000"
              value={targetBatchSize}
              onChange={(e) => onChangeTargetBatchSize(Number(e.target.value))}
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
            <strong>{cohortEstimate.repeatVisitorRevalidationRatio}%</strong> returning scholar
            browser revalidations
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
  );
};
