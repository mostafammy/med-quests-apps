import React from 'react';
import {
  ShieldCheck,
  BookOpen,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

import type { BlockPackDescriptor } from '../../../../domain/curriculum/BootBlockResolver.ts';

interface BlockPackInfo {
  manifest: {
    block: {
      name: { en: string };
      shortName: string;
      code: string;
    };
  };
}

interface GovernanceKpiHeaderProps {
  readonly activeBlockPack?: BlockPackDescriptor | BlockPackInfo | null;
  readonly globalActiveBlockId: string;
  readonly activeWorkspaceTab: 'review-queue' | 'canonical-curator';
  readonly onSetWorkspaceTab: (tab: 'review-queue' | 'canonical-curator') => void;
  readonly pendingReviewCount: number;
  readonly publishedCanonicalCount: number;
  readonly isLoading: boolean;
  readonly isResettingCache: boolean;
  readonly onResetLocalCache: () => void;
  readonly onReload: () => void;
  readonly resetFeedback: string | null;
  readonly actionFeedback: string | null;
}

export const GovernanceKpiHeader: React.FC<GovernanceKpiHeaderProps> = ({
  activeBlockPack,
  globalActiveBlockId,
  activeWorkspaceTab,
  onSetWorkspaceTab,
  pendingReviewCount,
  publishedCanonicalCount,
  isLoading,
  isResettingCache,
  onResetLocalCache,
  onReload,
  resetFeedback,
  actionFeedback,
}) => {
  return (
    <>
      {/* Header & Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSetWorkspaceTab('review-queue')}
            className={`py-2 px-4 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeWorkspaceTab === 'review-queue'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Faculty Review Queue</span>
            {pendingReviewCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeWorkspaceTab === 'review-queue'
                    ? 'bg-white text-indigo-600'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {pendingReviewCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSetWorkspaceTab('canonical-curator')}
            className={`py-2 px-4 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeWorkspaceTab === 'canonical-curator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Canonical Question Bank</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeWorkspaceTab === 'canonical-curator'
                  ? 'bg-white text-indigo-600'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {publishedCanonicalCount}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Active Block Scope Indicator */}
          <span
            data-testid="governance-active-block-pill"
            className="px-3 py-1.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>
              {activeBlockPack
                ? `${activeBlockPack.manifest.block.name.en} (${activeBlockPack.manifest.block.shortName}) - ${activeBlockPack.manifest.block.code}`
                : `Block: ${globalActiveBlockId.toUpperCase()}`}
            </span>
          </span>

          {/* Reset Local Bank Cache Button */}
          <button
            onClick={onResetLocalCache}
            disabled={isResettingCache}
            className="py-1.5 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Reset local IndexedDB questions back to published global items (preserves user stats & progress)"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${isResettingCache ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">
              {isResettingCache ? 'Resetting...' : 'Reset Local Bank Cache'}
            </span>
          </button>

          {/* Reload Governance Data Button */}
          <button
            onClick={onReload}
            disabled={isLoading}
            className="p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            title="Refresh bank telemetry"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-500' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Action / Reset Feedback Toasts */}
      {(resetFeedback || actionFeedback) && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{resetFeedback || actionFeedback}</span>
        </div>
      )}
    </>
  );
};
