import React from 'react';
import { X, Sparkles, Check, Gauge } from 'lucide-react';
import { useCopilotSettingsCoordinator } from './hooks/useCopilotSettingsCoordinator.ts';
import { ChatLanguageCard } from './components/settings/ChatLanguageCard.tsx';
import { ProviderTabs } from './components/settings/ProviderTabs.tsx';
import { GroqSettingsPane } from './components/settings/GroqSettingsPane.tsx';
import { GeminiSettingsPane } from './components/settings/GeminiSettingsPane.tsx';
import { OpenRouterSettingsPane } from './components/settings/OpenRouterSettingsPane.tsx';
import { CustomModelAccordion } from './components/settings/CustomModelAccordion.tsx';
import { ModelPerformanceInsightsModal } from './ModelPerformanceInsightsModal.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CopilotSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const coordinator = useCopilotSettingsCoordinator(onClose);

  if (!isOpen) return null;

  const currentCustomModel =
    coordinator.activeEngine === 'groq'
      ? coordinator.groqModel
      : coordinator.activeEngine === 'gemini'
      ? coordinator.geminiModel
      : coordinator.openRouterModel;

  const handleCustomModelChange = (val: string) => {
    if (coordinator.activeEngine === 'groq') coordinator.setGroqModel(val);
    else if (coordinator.activeEngine === 'gemini') coordinator.setGeminiModel(val);
    else coordinator.setOpenRouterModel(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-white dark:bg-zinc-950 border border-indigo-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top Accent Gradient */}
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-zinc-50 uppercase tracking-wide">
                {coordinator.t.copilot.settings.modalTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {coordinator.t.copilot.settings.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Co-Pilot Chat Response Language */}
        <ChatLanguageCard
          chatLanguage={coordinator.chatLanguage}
          onLanguageChange={coordinator.setChatLanguage}
          t={coordinator.t}
        />

        {/* Provider Tabs */}
        <ProviderTabs
          activeEngine={coordinator.activeEngine}
          onSelectEngine={coordinator.setActiveEngine}
        />

        {/* Scrollable Provider Details */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {coordinator.activeEngine === 'groq' && (
            <GroqSettingsPane
              groqKey={coordinator.groqKey}
              onKeyChange={coordinator.setGroqKey}
              groqModel={coordinator.groqModel}
              onModelChange={coordinator.setGroqModel}
              onDetectModels={coordinator.detectModelsForGroq}
              isDetecting={coordinator.isDetectingGroq}
              detectError={coordinator.detectError}
              detectedModels={coordinator.detectedGroqModels}
            />
          )}

          {coordinator.activeEngine === 'gemini' && (
            <GeminiSettingsPane
              geminiKey={coordinator.geminiKey}
              onKeyChange={coordinator.setGeminiKey}
              geminiModel={coordinator.geminiModel}
              onModelChange={coordinator.setGeminiModel}
            />
          )}

          {coordinator.activeEngine === 'openrouter' && (
            <OpenRouterSettingsPane
              openRouterKey={coordinator.openRouterKey}
              onKeyChange={coordinator.setOpenRouterKey}
              openRouterModel={coordinator.openRouterModel}
              onModelChange={coordinator.setOpenRouterModel}
            />
          )}

          {/* Expandable Advanced Custom Model ID */}
          <CustomModelAccordion
            showCustomModel={coordinator.showCustomModel}
            onToggle={() => coordinator.setShowCustomModel(!coordinator.showCustomModel)}
            currentModel={currentCustomModel}
            onModelChange={handleCustomModelChange}
          />
        </div>

        {/* Footer Save Button & Benchmarks Link */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => coordinator.setShowBenchmarks(true)}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center space-x-1 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
            <span>Speed Benchmarks</span>
          </button>
          <button
            onClick={coordinator.handleSave}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer shadow-md ${
              coordinator.savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-95'
            }`}
          >
            {coordinator.savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>{coordinator.t.common.saved}</span>
              </>
            ) : (
              <span>{coordinator.t.common.saveAndApply}</span>
            )}
          </button>
        </div>
      </div>

      {/* Embedded Model Performance Insights Modal */}
      <ModelPerformanceInsightsModal
        isOpen={coordinator.showBenchmarks}
        onClose={() => coordinator.setShowBenchmarks(false)}
      />
    </div>
  );
};
