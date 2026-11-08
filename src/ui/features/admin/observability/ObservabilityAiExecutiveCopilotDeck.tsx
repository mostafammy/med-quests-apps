import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import type {
  AiDiagnosticLensId,
  AiTelemetryBriefing,
  AiTelemetryInsightSection,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

interface ObservabilityAiExecutiveCopilotDeckProps {
  readonly activeAiLens: AiDiagnosticLensId;
  readonly selectedAiProvider: string;
  readonly aiBriefing: AiTelemetryBriefing | null;
  readonly isAiSynthesizing: boolean;
  readonly onChangeAiProvider: (
    provider: 'deterministic-local' | 'gemini' | 'groq' | 'openrouter'
  ) => void;
  readonly onChangeAiLens: (lens: AiDiagnosticLensId) => void;
  readonly onSynthesizeBriefing: () => void;
}

export const ObservabilityAiExecutiveCopilotDeck: React.FC<
  ObservabilityAiExecutiveCopilotDeckProps
> = ({
  activeAiLens,
  selectedAiProvider,
  aiBriefing,
  isAiSynthesizing,
  onChangeAiProvider,
  onChangeAiLens,
  onSynthesizeBriefing,
}) => {
  return (
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
              Automated biostatistical narrative synthesis translating raw Cloudflare edge telemetry
              into executive insights
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedAiProvider}
            onChange={(e) =>
              onChangeAiProvider(
                e.target.value as
                  | 'deterministic-local'
                  | 'gemini'
                  | 'groq'
                  | 'openrouter'
              )
            }
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <option value="deterministic-local">⚡ Apple Biostatistical Engine (0ms)</option>
            <option value="gemini">✨ Google Gemini 2.5 Flash</option>
            <option value="groq">⚡ Groq GPT-OSS-120B</option>
            <option value="openrouter">🌐 OpenRouter Cloud</option>
          </select>

          <button
            type="button"
            onClick={onSynthesizeBriefing}
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
            onClick={() => onChangeAiLens(lens.id as AiDiagnosticLensId)}
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
            {aiBriefing.sections.map((section: AiTelemetryInsightSection, idx: number) => (
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
                    {section.keyTakeaways.map((point: string, kIdx: number) => (
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
  );
};
