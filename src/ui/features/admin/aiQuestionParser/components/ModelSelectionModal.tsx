import React from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import type { CloudProviderId } from '../../../../../domain/ai/settings.ts';

export interface ModelOption {
  readonly providerId: CloudProviderId;
  readonly modelId: string;
  readonly name: string;
  readonly providerName: string;
  readonly badge: string;
  readonly speed: string;
  readonly description: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    providerName: 'Google Cloud Vertex',
    badge: 'Recommended • Fast & High Accuracy',
    speed: '< 400ms Sub-Second',
    description:
      'High throughput, optimal balance of medical reasoning and ultra-fast structured parsing.',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    providerName: 'Google Cloud Vertex',
    badge: 'Flagship Clinical Reasoning',
    speed: 'Deep Multi-turn (1M TPM)',
    description:
      'Gold standard for complex multi-system vignettes and deep pathophysiological rationale generation.',
  },
  {
    providerId: 'gemini',
    modelId: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    providerName: 'Google DeepMind',
    badge: 'Sub-100ms Ultra-Fast',
    speed: '< 80ms Instantaneous',
    description:
      'Next-generation lightweight Flash architecture for ultra-rapid parsing and real-time quorum validation.',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-120b',
    name: 'Groq GPT-OSS 120B',
    providerName: 'Groq Cloud LPU',
    badge: 'LPU Ultra-Low Latency',
    speed: '500+ tokens/sec',
    description:
      'Extreme inference throughput on massive parameter open weights for rapid bulk parsing.',
  },
  {
    providerId: 'groq',
    modelId: 'openai/gpt-oss-20b',
    name: 'Groq GPT-OSS 20B',
    providerName: 'Groq Cloud LPU',
    badge: 'Instant Light Model',
    speed: 'Instantaneous (<100ms)',
    description:
      'Ultra-lightweight model for swift single-question text formatting and basic MCQ extraction.',
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B',
    providerName: 'OpenRouter (NVIDIA)',
    badge: '550B Reasoning Beast',
    speed: 'Live & Verified (~1.4s)',
    description:
      'Massive 550-billion parameter reasoning model with deep medical thinking tokens and board-caliber accuracy.',
  },
  {
    providerId: 'openrouter',
    modelId: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Nemotron 3.5 Super VL',
    providerName: 'OpenRouter (NVIDIA)',
    badge: 'Clinical Reasoning Specialist',
    speed: 'Live & Verified (~1.2s)',
    description:
      'High-speed reasoning model with deep pathophysiological logic and structured output.',
  },
];

interface ModelSelectionModalProps {
  readonly isOpen: boolean;
  readonly selectedProvider: CloudProviderId;
  readonly selectedModelId: string;
  readonly onSelectModel: (providerId: CloudProviderId, modelId: string) => void;
  readonly onClose: () => void;
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isOpen,
  selectedProvider,
  selectedModelId,
  onSelectModel,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h3 className="text-base font-bold font-heading text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Select AI Reasoning Engine
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Choose the intelligence model that conducts clinical solving,
              rationale generation, and curriculum assignment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {MODEL_OPTIONS.map((opt) => {
            const isSelected =
              opt.providerId === selectedProvider &&
              opt.modelId === selectedModelId;
            return (
              <div
                key={`${opt.providerId}:::${opt.modelId}`}
                onClick={() => {
                  onSelectModel(opt.providerId, opt.modelId);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">
                      {opt.providerName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {opt.speed}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {opt.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {opt.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {opt.badge}
                  </span>
                  {isSelected && (
                    <span className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
