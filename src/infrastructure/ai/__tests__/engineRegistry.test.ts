import { describe, it, expect } from 'vitest';
import {
  resolveAiProvider,
  resolveAiEngine,
} from '../engineRegistry.ts';
import type { AiSettings } from '../../../domain/ai/settings.ts';

describe('Engine Registry & Cloud Provider Resolution (v2)', () => {
  const baseSettings: AiSettings = {
    engine: 'openrouter',
    openRouterApiKey: '',
    openRouterModel: 'meta-llama/llama-3.1-8b-instruct:free',
    groqApiKey: '',
    groqModel: 'openai/gpt-oss-20b',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
  };

  it('resolves OpenRouter provider directly when key is provided', () => {
    const settings: AiSettings = {
      ...baseSettings,
      engine: 'openrouter',
      openRouterApiKey: 'sk-or-test-key-123',
    };

    const provider = resolveAiProvider(settings);
    expect(provider.providerId).toBe('openrouter');
    expect(provider.modelId).toBe('meta-llama/llama-3.1-8b-instruct:free');
  });

  it('resolves Groq provider directly when Groq is selected and key is present', () => {
    const settings: AiSettings = {
      ...baseSettings,
      engine: 'groq',
      groqApiKey: 'gsk_test_groq_key_999',
    };

    const provider = resolveAiProvider(settings);
    expect(provider.providerId).toBe('groq');
    expect(provider.modelId).toBe('openai/gpt-oss-20b');
  });

  it('resolves Google Gemini provider directly when Gemini is selected and key is present', () => {
    const settings: AiSettings = {
      ...baseSettings,
      engine: 'gemini',
      geminiApiKey: 'AIzaSyTestGeminiKey',
    };

    const provider = resolveAiProvider(settings);
    expect(provider.providerId).toBe('gemini');
    expect(provider.modelId).toBe('gemini-2.5-flash');
  });

  it('falls back automatically to configured Groq key if OpenRouter key is empty', () => {
    const settings: AiSettings = {
      ...baseSettings,
      engine: 'openrouter',
      openRouterApiKey: '',
      groqApiKey: 'gsk_fallback_key',
    };

    const provider = resolveAiProvider(settings);
    expect(provider.providerId).toBe('groq');
  });

  it('falls back automatically to configured Gemini key if OpenRouter and Groq are empty', () => {
    const settings: AiSettings = {
      ...baseSettings,
      engine: 'openrouter',
      openRouterApiKey: '',
      groqApiKey: '',
      geminiApiKey: 'AIzaSy_fallback_key',
    };

    const provider = resolveAiProvider(settings);
    expect(provider.providerId).toBe('gemini');
  });

  it('never blocks on guest auth in resolveAiProvider', () => {
    // Even without an authenticated session, resolveAiProvider returns a live provider
    const settings: AiSettings = {
      ...baseSettings,
      groqApiKey: 'gsk_guest_key',
      engine: 'groq',
    };

    const provider = resolveAiProvider(settings);
    expect(provider.providerId).toBe('groq');
  });

  it('resolves ai engine ID with graceful openrouter fallback when unconfigured', () => {
    const engine = resolveAiEngine(baseSettings);
    expect(engine.id).toBe('openrouter');
  });
});
