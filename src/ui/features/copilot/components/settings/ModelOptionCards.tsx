import React from 'react';
import { Check } from 'lucide-react';
import type { ModelOptionInfo } from '../../../../../domain/ai/modelCatalog.ts';

interface ModelOptionCardsProps {
  options: readonly ModelOptionInfo[];
  selectedModel: string;
  onSelect: (id: string) => void;
}

export const ModelOptionCards: React.FC<ModelOptionCardsProps> = ({
  options,
  selectedModel,
  onSelect,
}) => {
  return (
    <div className="space-y-2 pt-1">
      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
        Choose Clinical Model:
      </label>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selectedModel === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col space-y-1.5 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/50'
                  : 'border-slate-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 hover:border-indigo-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">
                    {opt.simpleName}
                  </span>
                  {opt.isRecommended && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {opt.badge}
                    </span>
                  )}
                  {!opt.isRecommended && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                    {opt.speedLabel}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 dark:border-zinc-700'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                {opt.bestFor}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
