import { useState } from 'react';
import { useAiSettingsStore } from '../../../../application/stores/useAiSettingsStore.ts';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import type { CloudProviderId, AiChatLanguagePreference } from '../../../../domain/ai/settings.ts';

export function useCopilotSettingsCoordinator(onClose: () => void) {
  const { settings, updateSettings } = useAiSettingsStore();
  const { t } = useLocaleStore();

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
        const text = await res.text().catch(() => '');
        throw new Error(`Groq returned ${res.status}: ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      const chatModels: string[] = (data.data || [])
        .map((m: { id: string }) => m.id)
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

  return {
    t,
    activeEngine,
    setActiveEngine,
    chatLanguage,
    setChatLanguage,
    openRouterKey,
    setOpenRouterKey,
    openRouterModel,
    setOpenRouterModel,
    groqKey,
    setGroqKey,
    groqModel,
    setGroqModel,
    geminiKey,
    setGeminiKey,
    geminiModel,
    setGeminiModel,
    showCustomModel,
    setShowCustomModel,
    showBenchmarks,
    setShowBenchmarks,
    savedSuccess,
    detectedGroqModels,
    isDetectingGroq,
    detectError,
    detectModelsForGroq,
    handleSave,
  };
}
