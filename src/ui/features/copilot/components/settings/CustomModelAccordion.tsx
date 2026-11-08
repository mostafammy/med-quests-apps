import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CustomModelAccordionProps {
  showCustomModel: boolean;
  onToggle: () => void;
  currentModel: string;
  onModelChange: (model: string) => void;
}

export const CustomModelAccordion: React.FC<CustomModelAccordionProps> = ({
  showCustomModel,
  onToggle,
  currentModel,
  onModelChange,
}) => {
  return (
    <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/80">
      <button
        type="button"
        onClick={onToggle}
        className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center space-x-1 cursor-pointer"
      >
        <span>Advanced: Custom Model ID</span>
        {showCustomModel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showCustomModel && (
        <div className="mt-2 space-y-1">
          <input
            type="text"
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>
  );
};
