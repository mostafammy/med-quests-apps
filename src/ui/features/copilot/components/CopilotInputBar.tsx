import React from 'react';
import { Send, Square, Trash2 } from 'lucide-react';
import type { TranslationDictionary } from '../../../../domain/i18n/types.ts';

interface CopilotInputBarProps {
  inputText: string;
  onInputChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isStreaming: boolean;
  hasMessages: boolean;
  onClearMessages: () => void;
  onAbortStreaming: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  t: TranslationDictionary;
}

export const CopilotInputBar: React.FC<CopilotInputBarProps> = ({
  inputText,
  onInputChange,
  onSubmit,
  isStreaming,
  hasMessages,
  onClearMessages,
  onAbortStreaming,
  inputRef,
  t,
}) => {
  return (
    <div className="p-3.5 border-t border-slate-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
      <form onSubmit={onSubmit} className="relative flex items-center">
        <div className="relative flex-1 group">
          <input
            ref={inputRef}
            type="text"
            dir="auto"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={isStreaming ? t.copilot.inputStreamingPlaceholder : t.copilot.inputPlaceholder}
            disabled={isStreaming}
            className="w-full text-xs sm:text-sm ps-4 pe-12 py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-900/80 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-400 shadow-inner transition-all duration-300"
          />
          {hasMessages && !isStreaming && (
            <button
              type="button"
              onClick={onClearMessages}
              className="absolute end-3 top-3 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
              title={t.copilot.clearConversation}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="ms-2">
          {isStreaming ? (
            <button
              type="button"
              onClick={onAbortStreaming}
              className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/30 hover:scale-105 active:scale-95 cursor-pointer"
              title={t.copilot.stopGeneration}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:hover:scale-100 text-white transition-all shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 cursor-pointer"
              title={t.copilot.sendMessage}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
