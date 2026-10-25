import { describe, it, expect } from 'vitest';
import {
  PROVIDER_MODELS,
  getModelDisplayName,
} from '../modelCatalog.ts';

describe('Model Catalog (Simple Terms for Medical Students)', () => {
  it('provides structured human-friendly options for all providers', () => {
    expect(PROVIDER_MODELS.groq.length).toBeGreaterThanOrEqual(2);
    expect(PROVIDER_MODELS.gemini.length).toBeGreaterThanOrEqual(2);
    expect(PROVIDER_MODELS.openrouter.length).toBeGreaterThanOrEqual(2);

    // Each model has human-friendly labels
    const groqTop = PROVIDER_MODELS.groq[0];
    expect(groqTop.simpleName).toContain('Instant Socratic Mentor');
    expect(groqTop.speedLabel).toContain('50ms');
    expect(groqTop.bestFor).toContain('Real-time');
  });

  it('translates raw model IDs into simple display names for the UI pill', () => {
    expect(getModelDisplayName('groq', 'openai/gpt-oss-20b')).toBe('Instant 20B (~50ms)');
    expect(getModelDisplayName('groq', 'openai/gpt-oss-120b')).toBe('Deep Reasoning 120B');
    expect(getModelDisplayName('groq', 'qwen/qwen3.8-27b')).toBe('Specialist 27B');

    expect(getModelDisplayName('gemini', 'gemini-3.5-flash-lite')).toBe('Gemini 3.5 Flash Lite');
    expect(getModelDisplayName('gemini', 'gemini-2.5-flash')).toBe('Gemini 2.5 Flash');
    expect(getModelDisplayName('gemini', 'gemini-2.5-pro')).toBe('Gemini 2.5 Pro');

    expect(getModelDisplayName('openrouter', 'nvidia/nemotron-3.5-lightning:free')).toBe('Nemotron 3.5 (Free)');
    expect(getModelDisplayName('openrouter', 'recursive/flint-v1.0:free')).toBe('Flint 1.0 (Free)');
    expect(getModelDisplayName('openrouter', 'meta-llama/llama-3.1-8b-instruct:free')).toBe('Llama 3.1 8B (Free)');
  });
});
