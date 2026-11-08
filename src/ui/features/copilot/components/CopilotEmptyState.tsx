import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { TranslationDictionary } from '../../../../domain/i18n/types.ts';

interface CopilotEmptyStateProps {
  t: TranslationDictionary;
  onSelectPrompt: (prompt: string) => void;
}

export const CopilotEmptyState: React.FC<CopilotEmptyStateProps> = ({
  t,
  onSelectPrompt,
}) => {
  const starterSuggestions = t.copilot.starterPrompts;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-indigo-400/40 animate-spin-slow" />
        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      <div className="space-y-1 max-w-xs">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
          {t.copilot.emptyTitle}
        </h4>
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          {t.copilot.emptyDescription}
        </p>
      </div>

      {/* Starter Inquiry Prompts */}
      <div className="pt-2 w-full space-y-2">
        {starterSuggestions.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="w-full text-start p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:border-indigo-400 text-xs text-slate-700 dark:text-zinc-300 transition-all duration-200 flex items-center justify-between group shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <span className="font-medium pe-2">{prompt}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 rtl:-scale-x-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
