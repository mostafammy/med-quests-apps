/**
 * Presentation Component: ClusterCard
 * Renders a single duplicate equivalence group (cluster) for administrative triage
 * Layer: UI / Features / QDD
 *
 * Shows:
 * - Cluster severity badge (EXACT, CONFLICT, NEAR, SIBLING)
 * - Suggested canonical survivor with star badge
 * - Non-destructive triage actions: Archive Duplicate, Merge into Survivor, Link as Variant
 */

import React from 'react';
import {
  Crown,
  Archive,
  GitMerge,
  GitBranch,
  Copy,
} from 'lucide-react';
import type {
  DuplicateCluster,
  ResolutionAction,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export interface ClusterCardProps {
  readonly cluster: DuplicateCluster;
  readonly isResolving?: boolean;
  readonly onResolve: (action: ResolutionAction, duplicateId: string) => Promise<void>;
  readonly onInspect?: (subjectId: string, matchedId: string) => void;
}

export const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  isResolving = false,
  onResolve,
  onInspect,
}) => {
  const { id, relation, suggestedSurvivorId, memberIds, maxFusedScore } = cluster;
  const duplicateMembers = memberIds.filter((m) => m !== suggestedSurvivorId);

  const scorePercent = Math.round(maxFusedScore * 100);

  const relationStyles: Record<string, { bg: string; text: string; border: string }> = {
    EXACT: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    NEAR: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    CONFLICT: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
    SIBLING: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  };

  const currentStyle = relationStyles[relation] || relationStyles.NEAR;

  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 shadow-md space-y-4">
      {/* Cluster Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}
          >
            {relation} Cluster
          </span>
          <span className="text-xs font-mono text-slate-400">{id}</span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
          <span>{memberIds.length} items</span>
          <span>•</span>
          <span className="text-amber-300 font-semibold">{scorePercent}% Match</span>
        </div>
      </div>

      {/* Suggested Canonical Survivor */}
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span>Suggested Canonical Survivor:</span>
              <code className="font-mono text-white bg-black/30 px-1.5 py-0.5 rounded">
                {suggestedSurvivorId}
              </code>
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              Determined by: highest publication tier, authoritative evidence citations, and active student attempts.
            </p>
          </div>
        </div>
      </div>

      {/* Duplicate Candidates List */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Duplicate Candidates in Cluster ({duplicateMembers.length})
        </span>

        {duplicateMembers.map((dupId) => (
          <div
            key={dupId}
            className="p-3 rounded-xl bg-slate-800/40 border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <code className="text-xs font-mono font-medium text-slate-200">{dupId}</code>
            </div>

            {/* Action Buttons for this Duplicate */}
            <div className="flex items-center gap-2 flex-wrap">
              {onInspect && (
                <button
                  type="button"
                  onClick={() => onInspect(suggestedSurvivorId, dupId)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Compare</span>
                </button>
              )}

              <button
                type="button"
                disabled={isResolving}
                onClick={() => onResolve('MERGE_INTO_SURVIVOR', dupId)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Copy missing evidence/explanations to survivor, then soft-archive duplicate"
              >
                <GitMerge className="w-3 h-3 text-indigo-400" />
                <span>Merge</span>
              </button>

              <button
                type="button"
                disabled={isResolving}
                onClick={() => onResolve('ARCHIVE_DUPLICATE', dupId)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Soft-archive duplicate question; student attempts remain fully intact"
              >
                <Archive className="w-3 h-3 text-rose-400" />
                <span>Archive</span>
              </button>

              {relation === 'SIBLING' && (
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() => onResolve('LINK_AS_VARIANT', dupId)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <GitBranch className="w-3 h-3 text-purple-400" />
                  <span>Link Variant</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
