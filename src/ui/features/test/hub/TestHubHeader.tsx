import React from 'react';
import { Compass, RotateCcw } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface TestHubHeaderProps {
  readonly blockName: string;
  readonly blockCode: string;
  readonly totalQuestions: number;
  readonly onResetBank: () => void;
}

export const TestHubHeader: React.FC<TestHubHeaderProps> = ({
  blockName,
  blockCode,
  totalQuestions,
  onResetBank,
}) => {
  const { t } = useLocaleStore();

  return (
    <div className="glass-surface rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-xs border border-slate-200/70 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-400/15 border border-blue-500/20 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold tracking-wide">
            <Compass className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>{blockName} {blockCode} Exam Platform</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {t.test.hubTitle.replace('{blockName}', blockName)}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl font-medium">
            {t.test.hubSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="glass-pill-luxury px-3.5 py-1.5 rounded-xl flex items-center space-x-2 rtl:space-x-reverse border border-slate-200/60 dark:border-zinc-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
              {totalQuestions} <span className="font-semibold text-slate-500 dark:text-zinc-400">{t.common.questions}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onResetBank}
            className="glass-pill-luxury px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/60 dark:border-zinc-800 hover:border-rose-400/50 dark:hover:border-rose-500/40 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 cursor-pointer apple-tap transition-all duration-200"
            title={t.bank.resetToGlobalBtn}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span className="hidden sm:inline">{t.bank.resetToGlobalBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
