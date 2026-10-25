/**
 * Model Catalog & Human-Friendly Metadata
 * Translates raw AI provider strings (e.g. 'openai/gpt-oss-20b') into simple,
 * intuitive terms designed for medical students and clinicians.
 */
import type { CloudProviderId } from './settings.ts';

export interface ModelOptionInfo {
  readonly id: string;
  readonly simpleName: string;
  readonly badge: string;
  readonly bestFor: string;
  readonly speedLabel: string;
  readonly isRecommended?: boolean;
}

export const PROVIDER_MODELS: Record<Exclude<CloudProviderId, 'offline-tutor'>, readonly ModelOptionInfo[]> = {
  groq: [
    {
      id: 'openai/gpt-oss-20b',
      simpleName: 'Instant Socratic Mentor (20B)',
      badge: 'Recommended',
      speedLabel: '⚡ Ultra-Fast (~50ms)',
      bestFor: 'Real-time board practice, instant diagnostic hints, and interactive P-V loops.',
      isRecommended: true,
    },
    {
      id: 'openai/gpt-oss-120b',
      simpleName: 'Deep Clinical Reasoning (120B)',
      badge: 'Maximum Capability',
      speedLabel: '🧠 High Depth (~200ms)',
      bestFor: 'Complex multi-system clinical vignettes, difficult differential diagnosis puzzles, and advanced physiology.',
    },
    {
      id: 'qwen/qwen3.8-27b',
      simpleName: 'Clinical Specialist (27B)',
      badge: 'Balanced',
      speedLabel: '⚡ Fast (~100ms)',
      bestFor: 'Balanced diagnostic accuracy with fast tool-calling execution.',
    },
  ],

  gemini: [
    {
      id: 'gemini-3.5-flash-lite',
      simpleName: 'Gemini 3.5 Flash Lite',
      badge: 'Fastest / Recommended',
      speedLabel: '⚡ Ultra-Fast (~80ms)',
      bestFor: 'Instant Socratic guidance, active recall, ultra-low latency question hints.',
      isRecommended: true,
    },
    {
      id: 'gemini-2.5-flash',
      simpleName: 'Gemini 2.5 Flash',
      badge: 'Standard',
      speedLabel: '⚡ Fast & Multimodal',
      bestFor: 'Balanced medical reasoning, high-yield board mnemonics, and multimodal clinical cases.',
    },
    {
      id: 'gemini-3.8-flash',
      simpleName: 'Gemini 3.8 Flash',
      badge: 'High Reasoning',
      speedLabel: '🧠 Deep Thinking',
      bestFor: 'Complex multi-step clinical vignettes, diagnostic differential puzzles, and extended reasoning.',
    },
  ],

  openrouter: [
    {
      id: 'nvidia/nemotron-3.5-lightning:free',
      simpleName: 'Nemotron 3.5 Lightning (Free Tier)',
      badge: 'Recommended',
      speedLabel: '⚡ Fast / 1M Context',
      bestFor: 'High-throughput Socratic clinical guidance with 1M context window at zero cost.',
      isRecommended: true,
    },
    {
      id: 'recursive/flint-v1.0:free',
      simpleName: 'Recursive Flint (Free Tier)',
      badge: 'Agentic MoE',
      speedLabel: '⚡ Ultra-Fast MoE',
      bestFor: 'Agentic clinical reasoning and fast active-recall hints.',
    },
    {
      id: 'google/gemini-2.5-flash',
      simpleName: 'Gemini 2.5 Flash',
      badge: 'Cloud Hosted',
      speedLabel: '⚡ High Performance',
      bestFor: 'Google Gemini Flash routed via your OpenRouter account.',
    },
  ],
};

/**
 * Returns a concise, clean model display name for headers and pills.
 */
export function getModelDisplayName(engine: CloudProviderId, modelId: string): string {
  if (engine === 'groq') {
    if (modelId === 'openai/gpt-oss-20b') return 'Instant 20B (~50ms)';
    if (modelId === 'openai/gpt-oss-120b') return 'Deep Reasoning 120B';
    if (modelId === 'qwen/qwen3.8-27b') return 'Specialist 27B';
    if (modelId.includes('20b')) return 'GPT-OSS 20B';
    if (modelId.includes('120b')) return 'GPT-OSS 120B';
    return modelId.split('/').pop() || modelId;
  }

  if (engine === 'gemini') {
    if (modelId.includes('lite')) return 'Gemini 3.5 Flash Lite';
    if (modelId.includes('3.8')) return 'Gemini 3.8 Flash';
    if (modelId.includes('pro')) return 'Gemini 2.5 Pro';
    if (modelId.includes('flash')) return 'Gemini 2.5 Flash';
    return modelId;
  }

  if (engine === 'openrouter') {
    if (modelId.includes('nemotron')) return 'Nemotron 3.5 (Free)';
    if (modelId.includes('flint')) return 'Flint 1.0 (Free)';
    if (modelId.includes('llama-3.1-8b')) return 'Llama 3.1 8B (Free)';
    if (modelId.includes('gemini')) return 'Gemini Flash';
    return modelId.split('/').pop() || modelId;
  }

  return modelId;
}
