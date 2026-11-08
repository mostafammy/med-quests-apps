import React from 'react';
import { Cpu, Sparkles, Globe, Check } from 'lucide-react';
import type { CloudProviderId } from '../../../../../domain/ai/settings.ts';

interface ProviderTabsProps {
  activeEngine: CloudProviderId;
  onSelectEngine: (engine: CloudProviderId) => void;
}

export const ProviderTabs: React.FC<ProviderTabsProps> = ({
  activeEngine,
  onSelectEngine,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onSelectEngine('groq')}
        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
          activeEngine === 'groq'
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
            : 'border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <Cpu className="w-4 h-4 text-amber-500" />
          {activeEngine === 'groq' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
        </div>
        <div className="text-xs font-black">Groq LPU</div>
        <div className="text-[10px] text-slate-500">Ultra-fast (~50ms)</div>
      </button>

      <button
        type="button"
        onClick={() => onSelectEngine('gemini')}
        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
          activeEngine === 'gemini'
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
            : 'border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <Sparkles className="w-4 h-4 text-purple-500" />
          {activeEngine === 'gemini' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
        </div>
        <div className="text-xs font-black">Google Gemini</div>
        <div className="text-[10px] text-slate-500">Deep Clinical</div>
      </button>

      <button
        type="button"
        onClick={() => onSelectEngine('openrouter')}
        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
          activeEngine === 'openrouter'
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
            : 'border-slate-200/80 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          {activeEngine === 'openrouter' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
        </div>
        <div className="text-xs font-black">OpenRouter</div>
        <div className="text-[10px] text-slate-500">Free Community</div>
      </button>
    </div>
  );
};
