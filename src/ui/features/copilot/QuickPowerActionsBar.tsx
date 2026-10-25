import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Search,
  Activity,
  Sparkles,
  Users,
  HelpCircle,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { useCopilotStore } from '../../../application/stores/useCopilotStore.ts';
import { useAiSettingsStore } from '../../../application/stores/useAiSettingsStore.ts';
import { POWER_ACTIONS, type PowerActionDefinition } from '../../../domain/ai/powerActions.ts';

export const QuickPowerActionsBar: React.FC = () => {
  const {
    surface,
    activeQuestionId,
    isStreaming,
    executePowerAction,
    cachedActionKeys,
    clearQuestionAiCache,
  } = useCopilotStore();

  const { settings } = useAiSettingsStore();
  const isArabic = settings.chatLanguage === 'ar';

  if (!surface || surface.kind !== 'session' || !activeQuestionId) {
    return null;
  }

  const isRevealed = surface.isSubmitted;
  const currentModeFilter = isRevealed ? 'revealed' : 'sealed';

  const visibleActions = POWER_ACTIONS.filter(
    (action) => action.visibleWhen === 'always' || action.visibleWhen === currentModeFilter
  );

  const getIcon = (type: PowerActionDefinition['iconType']) => {
    switch (type) {
      case 'check':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'x-circle':
        return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'search':
        return <Search className="w-3.5 h-3.5 text-blue-500" />;
      case 'activity':
        return <Activity className="w-3.5 h-3.5 text-cyan-500" />;
      case 'sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
      case 'users':
        return <Users className="w-3.5 h-3.5 text-amber-500" />;
      case 'help':
        return <HelpCircle className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  const hasAnyCached = cachedActionKeys.size > 0;

  return (
    <div className="px-3.5 py-2 border-t border-slate-200/50 dark:border-zinc-800/60 bg-slate-50/70 dark:bg-zinc-900/40 backdrop-blur-md flex items-center justify-between gap-2 overflow-hidden select-none">
      {/* Scrollable Action Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pe-2 flex-1">
        {visibleActions.map((action) => {
          const isCached = cachedActionKeys.has(action.key);

          return (
            <button
              key={action.key}
              type="button"
              disabled={isStreaming}
              onClick={() => executePowerAction(action.key)}
              title={isArabic ? action.tooltipAr : action.tooltip}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isCached
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400/50 text-indigo-950 dark:text-indigo-200 shadow-2xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                  : 'bg-white/80 dark:bg-zinc-800/60 border-slate-200/90 dark:border-zinc-700/80 text-slate-700 dark:text-zinc-300 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              {getIcon(action.iconType)}
              <span>{isArabic ? action.shortLabelAr : action.shortLabel}</span>
              {isCached && (
                <span className="flex items-center text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold" title="0ms Instant Cache">
                  <Zap className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Power Users Option: Clear Cache for this question */}
      {hasAnyCached && (
        <button
          type="button"
          onClick={clearQuestionAiCache}
          title="Clear cached answers for this question"
          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
