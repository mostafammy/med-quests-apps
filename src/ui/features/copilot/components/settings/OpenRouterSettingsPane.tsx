import React from 'react';
import { Key, ExternalLink, AlertCircle } from 'lucide-react';
import { PROVIDER_MODELS } from '../../../../../domain/ai/modelCatalog.ts';
import { ModelOptionCards } from './ModelOptionCards.tsx';

interface OpenRouterSettingsPaneProps {
  openRouterKey: string;
  onKeyChange: (key: string) => void;
  openRouterModel: string;
  onModelChange: (model: string) => void;
}

export const OpenRouterSettingsPane: React.FC<OpenRouterSettingsPaneProps> = ({
  openRouterKey,
  onKeyChange,
  openRouterModel,
  onModelChange,
}) => {
  return (
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
            onChange={(e) => onKeyChange(e.target.value)}
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
      <ModelOptionCards
        options={PROVIDER_MODELS.openrouter}
        selectedModel={openRouterModel}
        onSelect={onModelChange}
      />
    </div>
  );
};
