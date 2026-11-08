import React from 'react';
import {
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Globe,
  Cpu,
  Languages,
  Gauge,
} from 'lucide-react';
import type { AiSettings } from '../../../../domain/ai/settings.ts';
import type { TranslationDictionary } from '../../../../domain/i18n/types.ts';
import { getModelDisplayName } from '../../../../domain/ai/modelCatalog.ts';

interface CopilotDrawerHeaderProps {
  activeResolvedEngine: string | null;
  settings: AiSettings;
  onOpenSettings: () => void;
  onOpenInsights: () => void;
  onUpdateSettings: (patch: Partial<AiSettings>) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
  t: TranslationDictionary;
}

export const CopilotDrawerHeader: React.FC<CopilotDrawerHeaderProps> = ({
  activeResolvedEngine,
  settings,
  onOpenSettings,
  onOpenInsights,
  onUpdateSettings,
  isExpanded,
  onToggleExpanded,
  onClose,
  t,
}) => {
  const effectiveEngine = (activeResolvedEngine || settings.engine) as 'groq' | 'gemini' | 'openrouter';
  const isFallback = Boolean(activeResolvedEngine && activeResolvedEngine !== settings.engine);
  const activeModelId =
    effectiveEngine === 'groq'
      ? settings.groqModel
      : effectiveEngine === 'gemini'
      ? settings.geminiModel
      : settings.openRouterModel;
  const friendlyModelName = getModelDisplayName(effectiveEngine, activeModelId);

  const currentLangPref = settings.chatLanguage || 'auto';
  const nextLang =
    currentLangPref === 'auto' ? 'en' : currentLangPref === 'en' ? 'ar' : 'auto';
  const langLabel =
    currentLangPref === 'auto' ? 'AUTO' : currentLangPref === 'en' ? 'EN' : 'عربي';

  return (
    <div className="px-4 py-3 border-b border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60 relative z-10">
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        {/* Holographic AI Core Orb */}
        <div className="relative flex items-center justify-center w-8 h-8">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-indigo-500 via-cyan-400 to-fuchsia-500 p-[1.5px] animate-spin-slow">
            <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-[10px]" />
          </div>
          <div className="relative w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-xs font-black tracking-wide uppercase bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
              {t.copilot.title}
            </span>

            {/* Model Engine Pill */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-500/20 flex items-center space-x-1 cursor-pointer hover:bg-indigo-500/20 transition-colors"
              title="Change engine or model in settings"
            >
              {effectiveEngine === 'openrouter' ? (
                <>
                  <Globe className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                  <span>OPENROUTER{isFallback ? ' (Backup)' : ''} • {friendlyModelName}</span>
                </>
              ) : effectiveEngine === 'groq' ? (
                <>
                  <Cpu className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                  <span>GROQ{isFallback ? ' (Backup)' : ''} • {friendlyModelName}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                  <span>GEMINI{isFallback ? ' (Backup)' : ''} • {friendlyModelName}</span>
                </>
              )}
            </button>

            {/* Chat Response Language Quick-Toggle Pill */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ chatLanguage: nextLang })}
              className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 font-extrabold border border-slate-300/60 dark:border-zinc-700/60 flex items-center space-x-1 cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
              title={`AI Chat Language: ${currentLangPref.toUpperCase()} (Click to toggle to ${nextLang.toUpperCase()})`}
            >
              <Languages className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
              <span>{langLabel}</span>
            </button>
          </div>
          <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
            {t.copilot.subtitle}
          </p>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center space-x-1 rtl:space-x-reverse">
        <button
          type="button"
          onClick={onOpenInsights}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          title="Model Speed & Telemetry Insights"
        >
          <Gauge className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          title="Provider Settings (BYO Key)"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          title={isExpanded ? t.copilot.collapseWidth : t.copilot.expandWidth}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          title={t.copilot.closeCopilot}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
