/**
 * Presentation Component: DuplicateHint
 * Calm, accessible, non-blocking inline duplicate advisory hint for Question Studio
 * Apple Design Standards:
 * - aria-live="polite", keyboard accessible (⌘↵ to inspect, Esc to dismiss)
 * - Zero layout shift, calm colors (never red or alarming)
 * - Actions: "Compare side-by-side", "This is a different question", "Make it a variant"
 * Layer: UI / Features / QDD
 */

import React, { useEffect } from 'react';
import {
  Sparkles,
  GitBranch,
  X,
} from 'lucide-react';
import type {
  DuplicateRelation,
  DuplicationVerdict,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export interface DuplicateHintProps {
  readonly verdict: DuplicationVerdict;
  readonly onInspect?: () => void;
  readonly onDismiss?: () => void;
  readonly onMakeVariant?: () => void;
  readonly className?: string;
}

export const DuplicateHint: React.FC<DuplicateHintProps> = ({
  verdict,
  onInspect,
  onDismiss,
  onMakeVariant,
  className = '',
}) => {
  // Listen for keyboard shortcuts: ⌘↵ (Cmd+Enter or Ctrl+Enter) to inspect, Esc to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onDismiss) {
        e.preventDefault();
        onDismiss();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onInspect) {
        e.preventDefault();
        onInspect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onInspect, onDismiss]);

  const candidate = verdict.candidates[0];
  if (!candidate) return null;

  const relation: DuplicateRelation = verdict.relation;
  const isSibling = relation === 'SIBLING';
  const jaccardPercent = candidate.signals.lexicalJaccard
    ? Math.round(candidate.signals.lexicalJaccard * 100)
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-3 rounded-2xl border transition-all duration-300 backdrop-blur-md text-xs select-none ${
        isSibling
          ? 'bg-purple-500/10 border-purple-500/25 text-purple-200'
          : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded-lg mt-0.5 bg-black/20 shrink-0">
            {isSibling ? (
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap font-medium">
              <span>
                {isSibling
                  ? 'Similar clinical vignette found (clinical variant):'
                  : 'A very similar question already exists in the bank:'}
              </span>
              <code className="text-white font-mono text-[11px] bg-black/20 px-1.5 py-0.2 rounded border border-white/10">
                {candidate.matchedQuestionId}
              </code>
              {jaccardPercent !== null && (
                <span className="opacity-75 text-[11px] font-medium">
                  ({jaccardPercent}% match)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 dark:text-zinc-400 line-clamp-1 italic">
              "{candidate.matchedStemPreview}"
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-black/20 transition-colors shrink-0"
            title="Dismiss hint (Esc)"
            aria-label="Dismiss hint"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
        {onInspect && (
          <button
            type="button"
            onClick={onInspect}
            className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 text-white font-medium transition-all flex items-center gap-1 active:scale-95"
          >
            <span>Compare side-by-side</span>
            <kbd className="text-[9px] font-mono opacity-60 bg-white/10 px-1 py-0.2 rounded ml-0.5">⌘↵</kbd>
          </button>
        )}

        {onMakeVariant && !isSibling && (
          <button
            type="button"
            onClick={onMakeVariant}
            className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium transition-all flex items-center gap-1"
          >
            <GitBranch className="w-3 h-3" />
            <span>Make it a variant</span>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            This is a different question
          </button>
        )}
      </div>
    </div>
  );
};
