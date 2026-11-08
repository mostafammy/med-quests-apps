import React from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface CurriculumScopeFilterControlsProps {
  readonly subjects: readonly { id: string; name: string }[];
  readonly availableChapters: readonly { id: string; name: string }[];
  readonly selectedSubject: string;
  readonly selectedChapter: string;
  readonly subjectCounts: Record<string, number>;
  readonly blockName: string;
  readonly selectedCategoryLabel: string;
  readonly highYieldOnly: boolean;
  readonly timedSprint: boolean;
  readonly isPracticeMode: boolean;
  readonly onSelectSubject: (subjectId: string) => void;
  readonly onSelectChapter: (chapterId: string) => void;
  readonly onToggleHighYield: () => void;
  readonly onToggleTimedSprint: () => void;
}

export const CurriculumScopeFilterControls: React.FC<CurriculumScopeFilterControlsProps> = ({
  subjects,
  availableChapters,
  selectedSubject,
  selectedChapter,
  subjectCounts,
  blockName,
  selectedCategoryLabel,
  highYieldOnly,
  timedSprint,
  isPracticeMode,
  onSelectSubject,
  onSelectChapter,
  onToggleHighYield,
  onToggleTimedSprint,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="space-y-3">
      {/* Subject Discipline Filter Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            {t.test.filterSubject}
          </label>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{selectedCategoryLabel}</span>
        </div>
        
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onSelectSubject('all')}
            className={`group py-1.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap ${
              selectedSubject === 'all'
                ? 'bg-blue-600 text-white shadow-xs scale-[1.01]'
                : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
            }`}
          >
            <span>{t.test.allSubjects.replace('{blockName}', blockName)}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
              selectedSubject === 'all' 
                ? 'bg-blue-700 text-blue-100' 
                : 'bg-slate-200/80 dark:bg-zinc-700/80 text-slate-700 dark:text-zinc-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300'
            }`}>
              {subjectCounts.all}
            </span>
          </button>

          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectSubject(sub.id)}
              className={`group py-1.5 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer apple-tap ${
                selectedSubject === sub.id
                  ? 'bg-blue-600 text-white shadow-xs scale-[1.01]'
                  : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
              }`}
            >
              <span>{sub.name.replace(/^(CVS|CNS)\s+/, '')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                selectedSubject === sub.id 
                  ? 'bg-blue-700 text-blue-100' 
                  : 'bg-slate-200/80 dark:bg-zinc-700/80 text-slate-700 dark:text-zinc-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300'
              }`}>
                {subjectCounts[sub.id] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chapter Selector & Toggles Inline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 items-end">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
            {t.test.filterChapter}
          </label>
          <select
            value={selectedChapter}
            onChange={(e) => onSelectChapter(e.target.value)}
            className="w-full text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 dark:text-zinc-100 shadow-xs transition-colors duration-200 cursor-pointer"
          >
            <option value="all">
              {selectedSubject === 'all' ? t.test.allChapters : t.test.filterChapter}
            </option>
            {availableChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isPracticeMode && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleHighYield}
              className={`flex-1 py-2.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 rtl:space-x-reverse border transition-all duration-150 cursor-pointer apple-tap ${
                highYieldOnly
                  ? 'bg-amber-500/15 border-amber-400/60 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 shadow-xs hover:bg-amber-500/20 dark:hover:bg-amber-500/25'
                  : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-400/50 dark:hover:border-amber-500/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
              }`}
              title={t.test.highYieldSub}
            >
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{t.test.highYieldOnly}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTimedSprint}
              className={`flex-1 py-2.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1.5 rtl:space-x-reverse border transition-all duration-150 cursor-pointer apple-tap ${
                timedSprint
                  ? 'bg-blue-500/15 border-blue-400/60 dark:border-blue-500/50 text-blue-900 dark:text-blue-200 shadow-xs hover:bg-blue-500/20 dark:hover:bg-blue-500/25'
                  : 'glass-pill-luxury text-slate-700 dark:text-zinc-300 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
              }`}
              title={t.test.timedSprintSub}
            >
              <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">{t.test.timedSprint}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
