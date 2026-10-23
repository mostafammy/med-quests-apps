import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useThemeStore, ThemePreference } from '../../application/stores/useThemeStore.ts';

export const ThemeToggle: React.FC = () => {
  const { preference, setTheme } = useThemeStore();

  const options: { id: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'Auto', icon: <Laptop className="w-3.5 h-3.5" /> },
    { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      role="group"
      aria-label="Appearance Mode"
      className="inline-flex p-0.5 bg-slate-200/70 dark:bg-zinc-800/80 rounded-xl backdrop-blur-md border border-slate-300/60 dark:border-zinc-700/60 transition-colors"
    >
      {options.map((option) => {
        const isActive = preference === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            aria-pressed={isActive}
            title={`Switch to ${option.label} mode`}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
              isActive
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs shadow-black/5 font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
