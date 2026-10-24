/**
 * Co-Pilot settings (v2.0). Cloud-native (OpenRouter, Groq, Gemini).
 * Persisted locally in IndexedDB (Constitution P8) and validated with Zod.
 */
import { z } from 'zod';

export const CloudProviderIdSchema = z.enum(['openrouter', 'groq', 'gemini', 'offline-tutor']);
export type CloudProviderId = z.infer<typeof CloudProviderIdSchema>;

export const AiSettingsSchema = z.object({
  engine: CloudProviderIdSchema.default('groq'),
  openRouterApiKey: z.string().default(''),
  openRouterModel: z.string().default('meta-llama/llama-3.1-8b-instruct:free'),
  groqApiKey: z.string().default(''),
  groqModel: z.string().default('openai/gpt-oss-20b'),
  geminiApiKey: z.string().default(''),
  geminiModel: z.string().default('gemini-3.5-flash-lite'),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const DEFAULT_AI_SETTINGS: AiSettings = {
  engine: 'groq',
  openRouterApiKey: '',
  openRouterModel: 'meta-llama/llama-3.1-8b-instruct:free',
  groqApiKey: '',
  groqModel: 'openai/gpt-oss-20b',
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash-lite',
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
          data.geminiModel === 'gemini-2.5-pro' || data.geminiModel === 'gemini-2.5-flash-lite'
            ? 'gemini-3.5-flash-lite'
            : data.geminiModel,
      };
    }
    // Auto-migrate decommissioned Gemini models
    if (data.geminiModel === 'gemini-2.5-pro' || data.geminiModel === 'gemini-2.5-flash-lite') {
      return {
        ...data,
        geminiModel: 'gemini-3.5-flash-lite',
      };
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
