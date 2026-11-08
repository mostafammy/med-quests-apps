import React from 'react';
import { Key, ExternalLink } from 'lucide-react';
import { PROVIDER_MODELS } from '../../../../../domain/ai/modelCatalog.ts';
import { ModelOptionCards } from './ModelOptionCards.tsx';

interface GeminiSettingsPaneProps {
  geminiKey: string;
  onKeyChange: (key: string) => void;
  geminiModel: string;
  onModelChange: (model: string) => void;
}

export const GeminiSettingsPane: React.FC<GeminiSettingsPaneProps> = ({
  geminiKey,
  onKeyChange,
  geminiModel,
  onModelChange,
}) => {
  return (
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
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Simple Model Cards */}
      <ModelOptionCards
        options={PROVIDER_MODELS.gemini}
        selectedModel={geminiModel}
        onSelect={onModelChange}
      />
    </div>
  );
};
