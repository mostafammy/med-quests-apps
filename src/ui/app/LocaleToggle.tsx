import React from 'react';
import { useLocaleStore } from '../../application/stores/useLocaleStore.ts';
import { Languages } from 'lucide-react';

export const LocaleToggle: React.FC = () => {
  const { locale, toggleLocale, t } = useLocaleStore();
  const isArabic = locale === 'ar';

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t.common.languageToggleAria}
      title={isArabic ? 'Switch to English (LTR)' : 'التبديل إلى العربية (RTL)'}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/60 dark:bg-zinc-800/60 hover:bg-white/90 dark:hover:bg-zinc-800/90 backdrop-blur-md border border-white/80 dark:border-zinc-700/70 text-xs font-black text-slate-800 dark:text-zinc-200 cursor-pointer shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-95 apple-tap select-none"
    >
      <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
      <span className="font-mono tracking-tight text-[11px]">
        {isArabic ? 'عربي' : 'EN'}
      </span>
      <span className="sr-only">
        {isArabic ? 'Active language is Arabic' : 'Active language is English'}
      </span>
    </button>
  );
};
