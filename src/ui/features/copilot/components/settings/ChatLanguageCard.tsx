import React from 'react';
import { Languages } from 'lucide-react';
import type { AiChatLanguagePreference } from '../../../../../domain/ai/settings.ts';
import type { TranslationDictionary } from '../../../../../domain/i18n/types.ts';

interface ChatLanguageCardProps {
  chatLanguage: AiChatLanguagePreference;
  onLanguageChange: (lang: AiChatLanguagePreference) => void;
  t: TranslationDictionary;
}

export const ChatLanguageCard: React.FC<ChatLanguageCardProps> = ({
  chatLanguage,
  onLanguageChange,
  t,
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 space-y-2 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <label className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wide">
            {t.copilot.settings.chatLanguageLabel}
          </label>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
          {t.copilot.settings.usmleTermsPreserved}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onLanguageChange('auto')}
          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            chatLanguage === 'auto'
              ? 'border-indigo-500 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
              : 'border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="text-xs font-bold">{t.copilot.settings.langAuto}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{t.copilot.settings.langAutoDesc}</div>
        </button>

        <button
          type="button"
          onClick={() => onLanguageChange('en')}
          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            chatLanguage === 'en'
              ? 'border-indigo-500 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
              : 'border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="text-xs font-bold">{t.copilot.settings.langEnglish}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{t.copilot.settings.langEnglishDesc}</div>
        </button>

        <button
          type="button"
          onClick={() => onLanguageChange('ar')}
          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            chatLanguage === 'ar'
              ? 'border-indigo-500 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
              : 'border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50'
          }`}
        >
          <div className="text-xs font-bold">{t.copilot.settings.langArabic}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{t.copilot.settings.langArabicDesc}</div>
        </button>
      </div>
    </div>
  );
};
