import React from 'react';
import { Sparkles } from 'lucide-react';
import { useCopilotStore } from '../../../application/stores/useCopilotStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';

export const CopilotTriggerButton: React.FC = () => {
  const { isOpen, toggleDrawer } = useCopilotStore();
  const { t } = useLocaleStore();

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      className={`relative group flex items-center justify-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse w-9 h-9 sm:w-auto sm:h-9 p-0 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all duration-300 border cursor-pointer select-none overflow-hidden shrink-0 apple-tap ${
        isOpen
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400/50 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/40'
          : 'bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200/80 dark:border-zinc-700/80 hover:border-indigo-400/60 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-indigo-500/15'
      }`}
      title={t.copilot.toggleAria}
      aria-label={t.copilot.title}
      aria-expanded={isOpen}
    >
      {/* Background kinetic sweep on hover */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

      <div className="relative flex items-center justify-center">
        <Sparkles
          className={`w-4 h-4 sm:w-3.5 sm:h-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 ${
            isOpen ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'
          }`}
        />
        {/* Subtle pulsing indicator ring */}
        <span className="absolute -inset-1 rounded-full bg-indigo-400/30 blur-xs -z-10 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <span className="tracking-tight font-extrabold hidden sm:inline">{t.copilot.title}</span>

      <span
        className={`hidden sm:inline-block font-mono text-[10px] font-black px-1.5 py-0.2 rounded-md ${
          isOpen
            ? 'bg-white/20 text-white'
            : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
        }`}
      >
        ?
      </span>
    </button>
  );
};
