import React, { useState } from 'react';
import { useAiSettingsStore } from '../../../application/stores/useAiSettingsStore.ts';
import { X, Sparkles, Key, Check, Globe, Cpu, ExternalLink, ChevronDown, ChevronUp, AlertCircle, Languages, Gauge } from 'lucide-react';
import type { CloudProviderId, AiChatLanguagePreference } from '../../../domain/ai/settings.ts';
import { PROVIDER_MODELS, type ModelOptionInfo } from '../../../domain/ai/modelCatalog.ts';
import { ModelPerformanceInsightsModal } from './ModelPerformanceInsightsModal.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CopilotSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAiSettingsStore();

  const [activeEngine, setActiveEngine] = useState<CloudProviderId>(settings.engine);
  const [chatLanguage, setChatLanguage] = useState<AiChatLanguagePreference>(settings.chatLanguage || 'auto');
  const [openRouterKey, setOpenRouterKey] = useState(settings.openRouterApiKey);
  const [openRouterModel, setOpenRouterModel] = useState(settings.openRouterModel);
  const [groqKey, setGroqKey] = useState(settings.groqApiKey);
  const [groqModel, setGroqModel] = useState(settings.groqModel);
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey);
  const [geminiModel, setGeminiModel] = useState(settings.geminiModel);
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Live Model Detection for Groq
  const [detectedGroqModels, setDetectedGroqModels] = useState<string[]>([]);
  const [isDetectingGroq, setIsDetectingGroq] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  if (!isOpen) return null;

  const detectModelsForGroq = async () => {
    if (!groqKey.trim()) return;
    setIsDetectingGroq(true);
    setDetectError(null);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey.trim()}` },
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid Groq API Key.');
        const t = await res.text().catch(() => '');
        throw new Error(`Groq returned ${res.status}: ${t.slice(0, 100)}`);
      }
      const data = await res.json();
      const chatModels: string[] = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => !id.includes('whisper') && !id.includes('guard'));
      setDetectedGroqModels(chatModels);
      if (chatModels.length > 0) {
        if (!chatModels.includes(groqModel)) {
          setGroqModel(chatModels[0]);
        }
      } else {
        setDetectError('No chat models enabled on this Groq key.');
      }
    } catch (err) {
      setDetectError((err as Error).message || 'Failed to detect models.');
    } finally {
      setIsDetectingGroq(false);
    }
  };

  const handleSave = async () => {
    await updateSettings({
      engine: activeEngine,
      chatLanguage,
      openRouterApiKey: openRouterKey,
      openRouterModel: openRouterModel,
      groqApiKey: groqKey,
      groqModel: groqModel,
      geminiApiKey: geminiKey,
      geminiModel: geminiModel,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  const renderModelCards = (
    options: readonly ModelOptionInfo[],
    selectedModel: string,
    onSelect: (id: string) => void
  ) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-white dark:bg-zinc-950 border border-indigo-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top Accent Gradient */}
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-zinc-50 uppercase tracking-wide">
                AI Co-Pilot Cloud Engines
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Choose your medical reasoning engine and speed preference
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

        {/* Co-Pilot Chat Response Language (Bilingual Apple HIG Card) */}
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <label className="text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wide">
                Chatbot Response Language
              </label>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              USMLE Terms Preserved
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setChatLanguage('auto')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                chatLanguage === 'auto'
                  ? 'border-indigo-500 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
                  : 'border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50'
              }`}
            >
              <div className="text-xs font-bold">Auto-Detect</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Mirror input script</div>
            </button>

            <button
              type="button"
              onClick={() => setChatLanguage('en')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                chatLanguage === 'en'
                  ? 'border-indigo-500 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
                  : 'border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50'
              }`}
            >
              <div className="text-xs font-bold">English</div>
              <div className="text-[9px] text-slate-400 mt-0.5">USMLE Standard</div>
            </button>

            <button
              type="button"
              onClick={() => setChatLanguage('ar')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                chatLanguage === 'ar'
                  ? 'border-indigo-500 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-500/30'
                  : 'border-slate-200/80 dark:border-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50'
              }`}
            >
              <div className="text-xs font-bold">العربية</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Medical Arabic</div>
            </button>
          </div>
        </div>

        {/* Provider Tabs */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveEngine('groq')}
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
            onClick={() => setActiveEngine('gemini')}
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
            onClick={() => setActiveEngine('openrouter')}
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

        {/* Scrollable Provider Details */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* GROQ TAB */}
          {activeEngine === 'groq' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Groq API Key</label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={detectModelsForGroq}
                      disabled={!groqKey.trim() || isDetectingGroq}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      {isDetectingGroq ? 'Checking key...' : 'Verify & Scan Key'}
                    </button>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {detectError && (
                <div className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900/50">
                  {detectError}
                </div>
              )}

              {/* Simple Model Cards */}
              {renderModelCards(PROVIDER_MODELS.groq, groqModel, setGroqModel)}

              {/* Detected models pills if scanned */}
              {detectedGroqModels.length > 0 && (
                <div className="pt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    Live Verified on Your Account ({detectedGroqModels.length}):
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {detectedGroqModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setGroqModel(m)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          groqModel === m
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GEMINI TAB */}
          {activeEngine === 'gemini' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Google Gemini API Key</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <span>Get Free Gemini Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Simple Model Cards */}
              {renderModelCards(PROVIDER_MODELS.gemini, geminiModel, setGeminiModel)}
            </div>
          )}

          {/* OPENROUTER TAB */}
          {activeEngine === 'openrouter' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">OpenRouter API Key</label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <span>Get OpenRouter Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {!openRouterKey.trim() && (
                  <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold">Free Account Key Required by OpenRouter:</div>
                      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                        Even for free models (like Llama 3.1 8B :free), OpenRouter requires an API key.
                        Get your free key with 0 credit at{' '}
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline font-bold">
                          openrouter.ai/keys
                        </a>{' '}
                        and paste it above. If you don't have an OpenRouter key, select <strong>Groq</strong> or <strong>Google Gemini</strong> (pre-configured with high limits).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Simple Model Cards */}
              {renderModelCards(PROVIDER_MODELS.openrouter, openRouterModel, setOpenRouterModel)}
            </div>
          )}

          {/* Expandable Advanced Custom Model ID */}
          <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setShowCustomModel(!showCustomModel)}
              className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center space-x-1 cursor-pointer"
            >
              <span>Advanced: Custom Model ID</span>
              {showCustomModel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showCustomModel && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  value={
                    activeEngine === 'groq'
                      ? groqModel
                      : activeEngine === 'gemini'
                      ? geminiModel
                      : openRouterModel
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeEngine === 'groq') setGroqModel(val);
                    else if (activeEngine === 'gemini') setGeminiModel(val);
                    else setOpenRouterModel(val);
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Save Button & Benchmarks Link */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setShowBenchmarks(true)}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center space-x-1 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
            <span>Speed Benchmarks</span>
          </button>
          <button
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-95'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save & Apply</span>
            )}
          </button>
        </div>
      </div>

      {/* Embedded Model Performance Insights Modal */}
      <ModelPerformanceInsightsModal
        isOpen={showBenchmarks}
        onClose={() => setShowBenchmarks(false)}
      />
    </div>
  );
};
