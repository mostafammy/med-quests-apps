import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../../domain/questionBank/aiQuestionParser/types.ts';
import { DuplicateBadge } from '../../../qdd/DuplicateBadge.tsx';

interface CanvasQddTabProps {
  readonly item: ParsedQuestionItem;
  readonly isCheckingDuplication: boolean;
  readonly onInspectDuplication?: (item: ParsedQuestionItem) => void;
}

export const CanvasQddTab: React.FC<CanvasQddTabProps> = ({
  item,
  isCheckingDuplication,
  onInspectDuplication,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850/60 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Question Duplication & Collision Analysis
            </span>
          </div>
          <DuplicateBadge
            verdict={item.qddVerdict}
            isChecking={isCheckingDuplication || item.isCheckingDuplication}
            onInspect={() => onInspectDuplication?.(item)}
          />
        </div>

        {item.qddVerdict ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">
                Audited Bank Scope:
              </span>
              <span className="text-zinc-500">220+ Canonical Bank Items</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">
                Relation Verdict:
              </span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                {item.qddVerdict.relation}
              </span>
            </div>
            {item.qddVerdict.candidates.length > 0 &&
              item.qddVerdict.candidates[0] && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-1">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">
                    Matched Canonical Item (
                    {item.qddVerdict.candidates[0].matchedQuestionId})
                  </div>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    {item.qddVerdict.candidates[0].matchedStemPreview}
                  </p>
                </div>
              )}

            {onInspectDuplication && item.qddVerdict.relation !== 'UNIQUE' && (
              <button
                type="button"
                onClick={() => onInspectDuplication(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Side-by-Side Collision Comparison Sheet</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 py-2">
            No duplication analysis record found. The item will be audited against
            the bank before committing.
          </div>
        )}
      </div>
    </div>
  );
};
