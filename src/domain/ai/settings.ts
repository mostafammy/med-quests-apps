/**
 * Co-Pilot settings (v2.0). Cloud-native (OpenRouter, Groq, Gemini).
 * Persisted locally in IndexedDB (Constitution P8) and validated with Zod.
 */
import { z } from 'zod';

export const CloudProviderIdSchema = z.enum(['openrouter', 'groq', 'gemini', 'offline-tutor']);
export type CloudProviderId = z.infer<typeof CloudProviderIdSchema>;

export const AiChatLanguagePreferenceSchema = z.enum(['auto', 'en', 'ar']);
export type AiChatLanguagePreference = z.infer<typeof AiChatLanguagePreferenceSchema>;

export const AiSettingsSchema = z.object({
  engine: CloudProviderIdSchema.default('groq'),
  chatLanguage: AiChatLanguagePreferenceSchema.default('auto'),
  openRouterApiKey: z.string().default(''),
  openRouterModel: z.string().default('nvidia/nemotron-3.5-lightning:free'),
  groqApiKey: z.string().default(''),
  groqModel: z.string().default('openai/gpt-oss-20b'),
  geminiApiKey: z.string().default(''),
  geminiModel: z.string().default('gemini-2.5-flash'),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  engine: 'groq',
  chatLanguage: 'auto',
  openRouterApiKey: '',
  openRouterModel: 'nvidia/nemotron-3.5-lightning:free',
  groqApiKey: '',
  groqModel: 'openai/gpt-oss-20b',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
};

export function parseAiSettings(raw: unknown): AiSettings {
  const parsed = AiSettingsSchema.safeParse(raw);
  if (parsed.success) {
    const data = parsed.data;
    // Auto-migrate decommissioned Groq models to current active gpt-oss-20b
    if (
      !data.groqModel ||
      data.groqModel === 'llama-3.1-8b-instant' ||
      data.groqModel === 'llama-3.3-70b-versatile'
    ) {
      return {
        ...data,
        engine: data.groqApiKey || data.engine === 'groq' ? 'groq' : data.engine,
        groqApiKey: data.groqApiKey || DEFAULT_AI_SETTINGS.groqApiKey,
        groqModel: 'openai/gpt-oss-20b',
        geminiModel:
          data.geminiModel === 'gemini-3.8-flash' || data.geminiModel === 'gemini-2.5-flash-lite'
            ? 'gemini-2.5-flash'
            : data.geminiModel,
        openRouterModel:
          data.openRouterModel === 'meta-llama/llama-3.1-8b-instruct:free' ||
          data.openRouterModel === 'meta-llama/llama-3-8b-instruct:free'
            ? 'nvidia/nemotron-3.5-lightning:free'
            : data.openRouterModel,
      };
    }
    // Auto-migrate decommissioned Gemini models (e.g. gemini-3.8-flash)
    if (data.geminiModel === 'gemini-3.8-flash' || data.geminiModel === 'gemini-2.5-flash-lite') {
      data.geminiModel = 'gemini-2.5-flash';
    }
    // Auto-migrate decommissioned OpenRouter models
    if (
      data.openRouterModel === 'meta-llama/llama-3.1-8b-instruct:free' ||
      data.openRouterModel === 'meta-llama/llama-3-8b-instruct:free'
    ) {
      data.openRouterModel = 'nvidia/nemotron-3.5-lightning:free';
    }
    return data;
  }
  // Migration fallback: if legacy row had 'offline-tutor', migrate to current active settings
  if (raw && typeof raw === 'object' && 'engine' in raw && (raw as { engine?: string }).engine === 'offline-tutor') {
    return {
      ...DEFAULT_AI_SETTINGS,
      groqApiKey: typeof (raw as any).groqApiKey === 'string' && (raw as any).groqApiKey.trim() ? (raw as any).groqApiKey : DEFAULT_AI_SETTINGS.groqApiKey,
      geminiApiKey: typeof (raw as any).geminiApiKey === 'string' ? (raw as any).geminiApiKey : '',
    };
  }
  return DEFAULT_AI_SETTINGS;
}
