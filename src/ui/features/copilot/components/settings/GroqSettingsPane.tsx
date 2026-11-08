import React from 'react';
import { Key, ExternalLink } from 'lucide-react';
import { PROVIDER_MODELS } from '../../../../../domain/ai/modelCatalog.ts';
import { ModelOptionCards } from './ModelOptionCards.tsx';

interface GroqSettingsPaneProps {
  groqKey: string;
  onKeyChange: (key: string) => void;
  groqModel: string;
  onModelChange: (model: string) => void;
  onDetectModels: () => void;
  isDetecting: boolean;
  detectError: string | null;
  detectedModels: string[];
}

export const GroqSettingsPane: React.FC<GroqSettingsPaneProps> = ({
  groqKey,
  onKeyChange,
  groqModel,
  onModelChange,
  onDetectModels,
  isDetecting,
  detectError,
  detectedModels,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-700 dark:text-zinc-300">Groq API Key</label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onDetectModels}
              disabled={!groqKey.trim() || isDetecting}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold disabled:opacity-40 cursor-pointer"
            >
              {isDetecting ? 'Checking key...' : 'Verify & Scan Key'}
            </button>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
            >
              <span>Get Free Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="relative">
          <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="password"
            value={groqKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="gsk_..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {detectError && (
        <div className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900/50">
          {detectError}
        </div>
      )}

      {/* Simple Model Cards */}
      <ModelOptionCards
        options={PROVIDER_MODELS.groq}
        selectedModel={groqModel}
        onSelect={onModelChange}
      />

      {/* Detected models pills if scanned */}
      {detectedModels.length > 0 && (
        <div className="pt-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
            Live Verified on Your Account ({detectedModels.length}):
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {detectedModels.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModelChange(m)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                  groqModel === m
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
