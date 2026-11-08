import React from 'react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { Question } from '../../../../domain/model/types.ts';
import type { SubjectReadinessStat as SubjectReadiness } from '../../../../domain/stats/cognitiveMetricsCalculator.ts';

export interface SubjectReadinessGridProps {
  readonly subjects: readonly { id: string; name: string }[];
  readonly chapters: readonly { id: string; name: string; subjectId: string }[];
  readonly subjectReadiness: Record<string, SubjectReadiness>;
  readonly questions: readonly Question[];
  readonly onPracticeSubject: (subjectId: string) => void;
}

export const SubjectReadinessGrid: React.FC<SubjectReadinessGridProps> = ({
  subjects,
  chapters,
  subjectReadiness,
  questions,
  onPracticeSubject,
}) => {
  const { t, locale } = useLocaleStore();

  const colorThemes = [
    {
      dotClass: 'bg-blue-500 shadow-blue-500/50',
      borderClass: 'border-blue-400/25 dark:border-blue-700/30',
      badgeClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
      btnClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      dotClass: 'bg-purple-500 shadow-purple-500/50',
      borderClass: 'border-purple-400/25 dark:border-purple-700/30',
      badgeClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
      btnClass: 'text-purple-600 dark:text-purple-400',
    },
    {
      dotClass: 'bg-emerald-500 shadow-emerald-500/50',
      borderClass: 'border-emerald-400/25 dark:border-emerald-700/30',
      badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
      btnClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      dotClass: 'bg-amber-500 shadow-amber-500/50',
      borderClass: 'border-amber-400/25 dark:border-amber-700/30',
      badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
      btnClass: 'text-amber-600 dark:text-amber-400',
    },
    {
      dotClass: 'bg-rose-500 shadow-rose-500/50',
      borderClass: 'border-rose-400/25 dark:border-rose-700/30',
      badgeClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
      btnClass: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
        {t.dashboard.taxonomyBreakdownTitle}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {subjects.map((subj, idx) => {
          const theme = colorThemes[idx % colorThemes.length];
          const stat = subjectReadiness[subj.id];
          const subjQuestions = questions.filter((q) => q.subjectId === subj.id);
          const totalQs = stat?.totalQuestions || subjQuestions.length;
          const correctPct =
            totalQs > 0 ? Math.round(((stat?.correctCount ?? 0) / totalQs) * 100) : 0;
          const mistakePct =
            totalQs > 0 ? Math.round(((stat?.incorrectCount ?? 0) / totalQs) * 100) : 0;
          const subjectChapters = chapters.filter((c) => c.subjectId === subj.id);
          const chaptersLabel = `${subjectChapters.length} ${locale === 'ar' ? 'فصول' : 'Chapters'}`;
          const desc = subjectChapters.length > 0
            ? subjectChapters.map((c) => c.name).join(', ')
            : subj.name;

          return (
            <div
              key={subj.id}
              className={`p-6 rounded-3xl glass-card-interactive space-y-3 ${theme.borderClass}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${theme.dotClass}`} />
                  <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm">
                    {subj.name}
                  </h3>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${theme.badgeClass}`}>
                  {stat && stat.answeredCount > 0
                    ? `${stat.accuracy}% Acc • ${stat.coveragePercent}% Seen`
                    : chaptersLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                {desc}
              </p>

              {/* Live Multi-Segment Mastery Bar (Correct / Mistake / Unseen) */}
              <div className="space-y-1 pt-1">
                <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-zinc-800 overflow-hidden flex">
                  {correctPct > 0 && (
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${correctPct}%` }}
                      title={`Mastered: ${stat?.correctCount ?? 0}`}
                    />
                  )}
                  {mistakePct > 0 && (
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${mistakePct}%` }}
                      title={`Needs Review: ${stat?.incorrectCount ?? 0}`}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                  <span>{stat?.correctCount ?? 0}✓ / {stat?.incorrectCount ?? 0}✗</span>
                  <span>{stat?.answeredCount ?? 0}/{totalQs} Attempted</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-slate-700 dark:text-zinc-300">
                  {totalQs} {t.common.questions}
                </span>
                <button
                  onClick={() => onPracticeSubject(subj.id)}
                  className={`${theme.btnClass} font-bold hover:underline cursor-pointer flex items-center space-x-1`}
                >
                  <span>
                    {stat && stat.answeredCount > 0
                      ? `${t.dashboard.continuePractice} →`
                      : `${t.dashboard.startPractice} →`}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
