/**
 * Engine Registry / Provider Factory
 * Resolves the active cloud provider without guest-auth gating.
 * Supports automatic fallback across configured providers (OpenRouter, Groq, Gemini)
 * and pulls environment variable fallbacks when available.
 */
import type { AiSettings } from '../../domain/ai/settings.ts';
import { OpenRouterProvider } from './providers/openRouterProvider.ts';
import { GroqProvider } from './providers/groqProvider.ts';
import { GeminiProvider } from './providers/geminiProvider.ts';

export type AnyCloudProvider = OpenRouterProvider | GroqProvider | GeminiProvider;

export interface AiEntitlementContext {
  readonly isCloudStreamingAllowed: boolean;
  readonly isAccountRestricted?: boolean;
}

export function getOpenRouterKey(settings: AiSettings): string {
  if (typeof settings.openRouterApiKey === 'string') {
    return settings.openRouterApiKey.trim();
  }
  try {
    return (import.meta as any).env?.VITE_OPENROUTER_API_KEY?.trim() || '';
  } catch {
    return '';
  }
}

export function getGroqKey(settings: AiSettings): string {
  if (typeof settings.groqApiKey === 'string') {
    return settings.groqApiKey.trim();
  }
  try {
    return (import.meta as any).env?.VITE_GROQ_API_KEY?.trim() || '';
  } catch {
    return '';
  }
}

export function getGeminiKey(settings: AiSettings): string {
  if (typeof settings.geminiApiKey === 'string') {
    return settings.geminiApiKey.trim();
  }
  try {
    return (import.meta as any).env?.VITE_GEMINI_API_KEY?.trim() || '';
  } catch {
    return '';
  }
}

export function resolveAiEngine(
  settings: AiSettings,
  entitlementContext: AiEntitlementContext = { isCloudStreamingAllowed: true, isAccountRestricted: false }
): { id: string } {
  if (entitlementContext.isAccountRestricted || !entitlementContext.isCloudStreamingAllowed) {
    return { id: 'openrouter' };
  }

  const groqKey = getGroqKey(settings);
  if (settings.engine === 'groq' && groqKey) {
    return { id: 'groq' };
  }

  const geminiKey = getGeminiKey(settings);
  if (settings.engine === 'gemini' && geminiKey) {
    return { id: 'gemini' };
  }

  const openRouterKey = getOpenRouterKey(settings);
  if (settings.engine === 'openrouter' && openRouterKey) {
    return { id: 'openrouter' };
  }

  return { id: 'openrouter' };
}

export function resolveAiProvider(settings: AiSettings): AnyCloudProvider {
  const openRouterKey = getOpenRouterKey(settings);
  const groqKey = getGroqKey(settings);
  const geminiKey = getGeminiKey(settings);

  // 1. Direct match on selected engine if its key is present
  if (settings.engine === 'openrouter' && openRouterKey) {
    return new OpenRouterProvider(openRouterKey, settings.openRouterModel);
  }

  if (settings.engine === 'groq' && groqKey) {
    return new GroqProvider(groqKey, settings.groqModel);
  }

  if (settings.engine === 'gemini' && geminiKey) {
    return new GeminiProvider(geminiKey, settings.geminiModel);
  }

  // 2. Automatic smart fallback to any configured provider
  // Prefer Gemini (1,000,000 TPM quota) over Groq (6,000 TPM quota) to avoid rate limits
  if (geminiKey) {
    return new GeminiProvider(geminiKey, settings.geminiModel);
  }

  if (groqKey) {
    return new GroqProvider(groqKey, settings.groqModel);
  }

  if (openRouterKey) {
    return new OpenRouterProvider(openRouterKey, settings.openRouterModel);
  }

  // 3. Default to OpenRouter instance (will surface clear key requirement prompt if unconfigured)
  return new OpenRouterProvider(openRouterKey, settings.openRouterModel);
}

/**
 * Resolves an alternate live cloud provider when the current provider encounters a rate limit (HTTP 429).
 */
export function getAvailableFallbackProvider(
  settings: AiSettings,
  failedProviderId: string
): AnyCloudProvider | null {
  const geminiKey = getGeminiKey(settings);
  const groqKey = getGroqKey(settings);
  const openRouterKey = getOpenRouterKey(settings);

  // 1. Google Gemini (1M TPM quota - ideal failover for rate-limited Groq or OpenRouter)
  if (failedProviderId !== 'gemini' && geminiKey) {
    return new GeminiProvider(geminiKey, settings.geminiModel || 'gemini-2.5-flash');
  }

  // 2. Groq (if Groq was not the failing provider)
  if (failedProviderId !== 'groq' && groqKey) {
    return new GroqProvider(groqKey, settings.groqModel || 'openai/gpt-oss-20b');
  }

  // 3. OpenRouter (if configured and not the failing provider)
  if (failedProviderId !== 'openrouter' && openRouterKey) {
    return new OpenRouterProvider(openRouterKey, settings.openRouterModel);
  }

  return null;
}
