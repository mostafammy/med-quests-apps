import React from 'react';

export interface PacingQuadrantsData {
  readonly fastAccurate: number;
  readonly slowAccurate: number;
  readonly fastWrong: number;
  readonly slowWrong: number;
}

export interface ConfidenceCalibrationData {
  readonly sureCorrect: number;
  readonly sureWrong: number;
  readonly unsureCorrect: number;
  readonly unsureWrong: number;
}

export interface CognitiveTelemetryRingsCockpitProps {
  readonly masteryPercentage: number;
  readonly overallAccuracy: number;
  readonly streakDays: number;
  readonly todayAttempts: number;
  readonly dailyGoalTarget: number;
  readonly pacingQuadrants: PacingQuadrantsData;
  readonly confidenceCalibration: ConfidenceCalibrationData;
  readonly avgPaceSeconds: number;
}

export const CognitiveTelemetryRingsCockpit: React.FC<CognitiveTelemetryRingsCockpitProps> = ({
  masteryPercentage,
  overallAccuracy,
  streakDays,
  todayAttempts,
  dailyGoalTarget,
  pacingQuadrants,
  confidenceCalibration,
  avgPaceSeconds,
}) => {
  return (
    <div className="p-5 sm:p-6 md:p-7 rounded-3xl glass-surface border border-white/80 dark:border-zinc-800/80 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 5 Cols: Concentric Apple Activity Rings + Legend */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
              {/* Outer Ring Track (Mastery %) */}
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-emerald-500/15 dark:text-emerald-500/20"
              />
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 58}
                strokeDashoffset={
                  2 * Math.PI * 58 * (1 - Math.min(100, Math.max(2, masteryPercentage)) / 100)
                }
                className="transition-all duration-700"
              />

              {/* Middle Ring Track (Accuracy %) */}
              <circle
                cx="70"
                cy="70"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-blue-500/15 dark:text-blue-500/20"
              />
              <circle
                cx="70"
                cy="70"
                r="44"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={
                  2 * Math.PI * 44 * (1 - Math.min(100, Math.max(2, overallAccuracy)) / 100)
                }
                className="transition-all duration-700"
              />

              {/* Inner Ring Track (Daily Goal) */}
              <circle
                cx="70"
                cy="70"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-amber-500/15 dark:text-amber-500/20"
              />
              <circle
                cx="70"
                cy="70"
                r="30"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={
                  2 *
                  Math.PI *
                  30 *
                  (1 - Math.min(1, Math.max(0.03, todayAttempts / Math.max(1, dailyGoalTarget))))
                }
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Streak
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-zinc-100 leading-none mt-0.5">
                {streakDays}d
              </span>
            </div>
          </div>

          <div className="space-y-2.5 flex-1 w-full">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Apple Cognitive Telemetry Rings
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                Daily Readiness & Pacing Pulse
              </h3>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-600 dark:text-zinc-300 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Block Mastery Ring</span>
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {masteryPercentage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-600 dark:text-zinc-300 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Diagnostic Accuracy</span>
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {overallAccuracy}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2 text-slate-600 dark:text-zinc-300 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Daily Study Target</span>
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {todayAttempts} / {dailyGoalTarget} Qs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: 4-Quadrant Pacing & Confidence Calibration */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200/60 dark:border-zinc-800/60 lg:pl-6">
          <div className="p-3 rounded-2xl bg-emerald-500/8 dark:bg-emerald-950/25 border border-emerald-500/20 space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">
              Fast & Accurate
            </div>
            <div className="text-xl font-black text-emerald-900 dark:text-emerald-200">
              {pacingQuadrants.fastAccurate}
            </div>
            <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
              ≤45s Automatic Recall
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-500/8 dark:bg-blue-950/25 border border-blue-500/20 space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-400">
              Avg Pacing Speed
            </div>
            <div className="text-xl font-black text-blue-900 dark:text-blue-200">
              {avgPaceSeconds > 0 ? `${avgPaceSeconds}s` : '—'}
            </div>
            <div className="text-[10px] text-blue-700/80 dark:text-blue-300/80">
              {pacingQuadrants.slowAccurate} Deliberate Correct
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/8 dark:bg-amber-950/25 border border-amber-500/20 space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400">
              Rushed Mistakes
            </div>
            <div className="text-xl font-black text-amber-900 dark:text-amber-200">
              {pacingQuadrants.fastWrong}
            </div>
            <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
              Premature Closure (≤45s)
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/8 dark:bg-rose-950/25 border border-rose-500/20 space-y-1">
            <div className="text-[10px] font-extrabold uppercase text-rose-700 dark:text-rose-400">
              Danger Zone
            </div>
            <div className="text-xl font-black text-rose-900 dark:text-rose-200">
              {confidenceCalibration.sureWrong}
            </div>
            <div className="text-[10px] text-rose-700/80 dark:text-rose-300/80">
              Confident Mistakes • {confidenceCalibration.sureCorrect} Sure✓
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
