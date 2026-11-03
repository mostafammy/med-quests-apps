/**
 * Presentation Component: DuplicateBadge
 * Displays Apple-standard, color-coded duplication status badge for parsed questions
 * Layer: UI / Features / QDD
 *
 * Visual Tokens:
 * - EXACT: "Already in the bank" (blue/neutral)
 * - NEAR: "Likely duplicate" (amber)
 * - CONFLICT: "Answer conflict" (rose/red)
 * - SIBLING: "Related variant" (purple/gray)
 * - UNIQUE: "Unique" (emerald/green)
 */

import React from 'react';
import {
  Copy,
  AlertTriangle,
  AlertCircle,
  GitBranch,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type {
  DuplicateRelation,
  DuplicationVerdict,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export interface DuplicateBadgeProps {
  readonly verdict?: DuplicationVerdict;
  readonly isChecking?: boolean;
  readonly onInspect?: () => void;
  readonly showUnique?: boolean;
  readonly className?: string;
}

interface BadgeConfig {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly containerClasses: string;
  readonly tooltip: string;
}

export const DuplicateBadge: React.FC<DuplicateBadgeProps> = ({
  verdict,
  isChecking = false,
  onInspect,
  showUnique = true,
  className = '',
}) => {
  // 1. Shimmering Checking State
  if (isChecking) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 animate-pulse ${className}`}
        aria-live="polite"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        <span>Checking duplicates…</span>
      </span>
    );
  }

  // 2. No Verdict yet
  if (!verdict) {
    return null;
  }

  const relation: DuplicateRelation = verdict.relation;
  const candidateCount = verdict.candidates.length;
  const firstCand = verdict.candidates[0];

  // If Unique and showUnique is false, don't render anything
  if (relation === 'UNIQUE' && !showUnique) {
    return null;
  }

  // 3. Build token configurations per relation
  const configMap: Record<DuplicateRelation, BadgeConfig> = {
    EXACT: {
      label: firstCand ? `Already in bank (${firstCand.matchedQuestionId})` : 'Already in the bank',
      icon: <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
      containerClasses:
        'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50',
      tooltip: 'Exact duplicate of an existing canonical question or in-batch item.',
    },
    NEAR: {
      label: firstCand ? `Likely duplicate (${firstCand.matchedQuestionId})` : 'Likely duplicate',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
      containerClasses:
        'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50',
      tooltip: 'High semantic or lexical overlap detected with an existing question.',
    },
    CONFLICT: {
      label: firstCand ? `Answer conflict (${firstCand.matchedQuestionId})` : 'Answer conflict',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
      containerClasses:
        'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50',
      tooltip: 'Identical clinical vignette but different keyed correct answers! Requires faculty review.',
    },
    SIBLING: {
      label: firstCand ? `Related variant (${firstCand.matchedQuestionId})` : 'Related variant',
      icon: <GitBranch className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
      containerClasses:
        'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50',
      tooltip: 'Shared stem structure with clinical discriminator difference (e.g. negation, laterality, dosing).',
    },
    UNIQUE: {
      label: 'Unique',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      containerClasses: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      tooltip: 'No duplicate candidates detected against the bank or batch.',
    },
  };

  const currentConfig = configMap[relation];
  const isInteractive = Boolean(onInspect && candidateCount > 0);

  const handleClick = (e: React.MouseEvent) => {
    if (isInteractive && onInspect) {
      e.stopPropagation();
      onInspect();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractive && onInspect && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      onInspect();
    }
  };

  return (
    <span
      role={isInteractive ? 'button' : 'status'}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={currentConfig.tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 select-none ${
        currentConfig.containerClasses
      } ${isInteractive ? 'cursor-pointer active:scale-95 shadow-sm' : ''} ${className}`}
    >
      {currentConfig.icon}
      <span>{currentConfig.label}</span>
      {isInteractive && (
        <span className="inline-flex items-center text-[10px] opacity-75 ml-0.5 font-mono">
          <span>Compare</span>
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      )}
    </span>
  );
};
