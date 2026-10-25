import React, { useState, useEffect, useMemo } from 'react';
import { Brain, ChevronDown } from 'lucide-react';

interface ThinkingAccordionProps {
  readonly thinking: string;
  readonly isStreaming?: boolean;
}

export const ThinkingAccordion: React.FC<ThinkingAccordionProps> = ({
  thinking,
  isStreaming = false,
}) => {
  // Auto-expand during live streaming, collapsed by default when complete
  const [isOpen, setIsOpen] = useState<boolean>(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    }
  }, [isStreaming]);

  const wordCount = useMemo(() => {
    const trimmed = thinking.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [thinking]);

  if (!thinking.trim()) return null;

  return (
    <div className="w-full my-1 rounded-xl overflow-hidden border border-indigo-200/50 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/40 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {isStreaming ? (
            <div className="relative flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            </div>
          ) : (
            <Brain className="w-3.5 h-3.5 text-indigo-600/80 dark:text-indigo-400/80" />
          )}
          <span className="font-semibold text-[11px] tracking-wide">
            {isStreaming ? (
              <span className="inline-flex items-center gap-1.5">
                Thinking process...
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-ping" />
              </span>
            ) : (
              `Clinical Reasoning Chain (${wordCount} words)`
            )}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[10px] text-indigo-600/70 dark:text-indigo-400/70">
          <span className="hidden sm:inline font-mono">{isOpen ? 'Hide' : 'Show'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
          <div className="p-3 rounded-lg bg-white/70 dark:bg-zinc-950/70 border border-indigo-100 dark:border-zinc-800/80 text-[11px] font-mono leading-relaxed text-slate-700 dark:text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto selection:bg-indigo-200 dark:selection:bg-indigo-900">
            {thinking}
          </div>
        </div>
      )}
    </div>
  );
};
