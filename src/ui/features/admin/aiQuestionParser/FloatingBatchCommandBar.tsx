/**
 * FloatingBatchCommandBar
 * Design System: Apple Human Interface Guidelines (macOS / iPadOS Glass Dark Capsule)
 *
 * Provides a floating, persistent command dock pinned to the bottom of the viewport
 * so the user can execute batch actions (Select All, Copy Batch Prompt, Save Unique, Commit to Bank)
 * instantly without scrolling through the questions.
 */

import React from 'react';
import {
  CheckSquare,
  Square,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface FloatingBatchCommandBarProps {
  readonly totalCount: number;
  readonly selectedCount: number;
  readonly isCommitting: boolean;
  readonly isCheckingDuplication: boolean;
  readonly copiedBatchPrompt: boolean;
  readonly onToggleSelectAll: () => void;
  readonly onCopyBatchPrompt: () => void;
  readonly onSaveAllUnique: () => void;
  readonly onCommitToBank: () => void;
}

export const FloatingBatchCommandBar: React.FC<FloatingBatchCommandBarProps> = ({
  totalCount,
  selectedCount,
  isCommitting,
  isCheckingDuplication,
  copiedBatchPrompt,
  onToggleSelectAll,
  onCopyBatchPrompt,
  onSaveAllUnique,
  onCommitToBank,
}) => {
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <aside
      aria-label="Batch Actions Floating Dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[92%] sm:w-auto animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="glass-dark-capsule px-4 py-2.5 sm:px-6 sm:py-3 rounded-full flex items-center justify-between sm:justify-start gap-3 sm:gap-4 shadow-2xl border border-white/20 dark:border-white/10 text-white backdrop-blur-2xl">
        {/* Selection Counter Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelectAll}
            title={allSelected ? 'Deselect all questions' : 'Select all questions'}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-purple-400" />
            ) : (
              <Square className="w-4 h-4 text-zinc-400" />
            )}
            <span className="hidden sm:inline">
              {allSelected ? 'Deselect All' : 'Select All'}
            </span>
          </button>

          <span className="text-zinc-600 dark:text-zinc-500 hidden sm:inline">•</span>

          <span className="text-[11px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200">
            {selectedCount} of {totalCount} Selected
          </span>
        </div>

        <div className="h-4 w-px bg-white/15 hidden sm:block" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Copy Batch Prompt */}
          <button
            type="button"
            onClick={onCopyBatchPrompt}
            title="Copy a single comprehensive prompt for all selected questions to cross-examine with other LLMs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-200 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {copiedBatchPrompt ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-purple-300" />
            )}
            <span className="hidden md:inline">
              {copiedBatchPrompt ? 'Batch Prompt Copied!' : 'Copy Batch Prompt'}
            </span>
            <span className="md:hidden">Prompt</span>
          </button>

          {/* Save All Unique */}
          <button
            type="button"
            onClick={onSaveAllUnique}
            disabled={isCommitting || isCheckingDuplication || totalCount === 0}
            title="Automatically skip all questions flagged as duplicates or conflicts and commit only unique items to the bank"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-600/90 hover:bg-blue-500 border border-blue-400/30 text-white transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
            <span className="hidden sm:inline">
              {isCommitting ? 'Saving…' : 'Save all unique'}
            </span>
            <span className="sm:hidden">Unique</span>
          </button>

          {/* Primary Commit Button */}
          <button
            type="button"
            onClick={onCommitToBank}
            disabled={isCommitting || selectedCount === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white transition-all cursor-pointer shadow-lg shadow-emerald-500/25 border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isCommitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>
              {isCommitting
                ? 'Committing…'
                : `Approve & Commit (${selectedCount}) to Bank`}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};
