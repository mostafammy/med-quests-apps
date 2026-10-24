import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useThemeStore, ThemePreference } from '../../application/stores/useThemeStore.ts';

export const ThemeToggle: React.FC = () => {
  const { preference, resolvedTheme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options: {
    id: ThemePreference;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'light',
      label: 'Light',
      description: 'Clean & high-contrast',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'Deep OLED & night mode',
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'system',
      label: 'Auto (System)',
      description: 'Matches device appearance',
      icon: <Laptop className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
    },
  ];

  const currentOption = options.find((o) => o.id === preference) || options[0];

  // Dynamic active icon representation
  const activeIcon =
    preference === 'light' ? (
      <Sun className="w-4 h-4 text-amber-500" />
    ) : preference === 'dark' ? (
      <Moon className="w-4 h-4 text-indigo-400" />
    ) : resolvedTheme === 'dark' ? (
      <Moon className="w-4 h-4 text-indigo-400" />
    ) : (
      <Sun className="w-4 h-4 text-amber-500" />
    );

  // Global Outside-Click & Touch Dismissal Handler (Guaranteed 100% Reliable on iOS & Android WebKit)
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideInteraction = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Use passive event listeners for high scroll & touch performance
    window.addEventListener('pointerdown', handleOutsideInteraction, { passive: true });
    window.addEventListener('touchstart', handleOutsideInteraction, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handleOutsideInteraction);
      window.removeEventListener('touchstart', handleOutsideInteraction);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id: ThemePreference) => {
    setTheme(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Apple Squircle / Tactile Glass Appearance Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Appearance: ${currentOption.label}. Tap to choose theme.`}
        aria-label={`Appearance: ${currentOption.label}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`w-9 h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer apple-tap shrink-0 ${
          isOpen
            ? 'bg-white dark:bg-zinc-800 shadow-md ring-2 ring-blue-500/30 border border-blue-400/40 dark:border-blue-500/40'
            : 'glass-surface border border-white/80 dark:border-zinc-700/80 shadow-xs hover:bg-white/90 dark:hover:bg-zinc-800/90'
        }`}
      >
        <span className="transform transition-transform duration-200 active:scale-90">
          {activeIcon}
        </span>
      </button>

      {/* Apple Frosted Glass Popover Menu with Fluid Kinetic Spring Collapse */}
      <div
        role="menu"
        aria-orientation="vertical"
        className={`absolute right-0 top-full mt-2 w-52 rounded-2xl glass-surface p-1.5 shadow-2xl border border-white/90 dark:border-zinc-700/80 backdrop-blur-2xl z-50 origin-top-right transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 select-none">
          <span>Appearance</span>
          <span className="text-[9px] font-mono font-bold capitalize text-blue-600 dark:text-blue-400">
            {preference}
          </span>
        </div>

        <div className="space-y-1 mt-1">
          {options.map((opt) => {
            const isSelected = preference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(opt.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer apple-tap ${
                  isSelected
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="flex items-center space-x-2.5 text-left">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-500/15' : 'bg-slate-100 dark:bg-zinc-800'
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <div className="leading-tight">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal leading-none mt-0.5">
                      {opt.description}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
