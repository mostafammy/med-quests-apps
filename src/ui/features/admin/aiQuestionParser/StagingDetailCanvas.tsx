/**
 * StagingDetailCanvas
 * Design System: Apple Human Interface Guidelines (macOS / iPadOS Spatial Workspace Canvas)
 *
 * Detailed staging canvas for the actively selected question.
 * Replaces vertical scrolling with an organized Apple segmented tab system:
 * - [Single-Best Answer]: Stem, Choices A-D, Rationales & Clinical Explanation
 * - [Curriculum Alignment]: Autonomous Auto-Classifier, 3-Pill Taxonomy, Gap Alerts & Reassignment
 * - [Multi-Model Quorum]: Consensus summary, agreement ratio & model verdicts
 * - [Deduplication Audit]: QDD duplicate & collision inspector against canonical bank
 */

import React, { useState } from 'react';
import {
  FileText,
  Layers,
  Scale,
  ShieldCheck,
  Edit3,
  Trash2,
  Copy,
} from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../domain/questionBank/aiQuestionParser/types.ts';
import type { ChoiceId } from '../../../../domain/model/types.ts';
import { curriculumTaxonomyRegistry } from '../../../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { TaxonomyDisplayResolver } from '../../../../domain/taxonomy/TaxonomyDisplayResolver.ts';
import { compositionRoot } from '../../../../application/composition/clientCompositionRoot.ts';
import { CanvasSbaTab } from './components/CanvasSbaTab.tsx';
import { CanvasCurriculumTab } from './components/CanvasCurriculumTab.tsx';
import { CanvasQuorumTab } from './components/CanvasQuorumTab.tsx';
import { CanvasQddTab } from './components/CanvasQddTab.tsx';

interface StagingDetailCanvasProps {
  readonly item: ParsedQuestionItem;
  readonly index: number;
  readonly totalCount: number;
  readonly isEditing: boolean;
  readonly onToggleEdit: () => void;
  readonly onDelete: () => void;
  readonly onCopyPrompt: () => void;
  readonly isPromptCopied: boolean;
  readonly onToggleStemFormat: () => void;
  readonly onUpdateStem: (newStem: string) => void;
  readonly onUpdateChoice: (
    choiceId: ChoiceId,
    text: string,
    rationale: string
  ) => void;
  readonly onSetKeyedChoice: (choiceId: ChoiceId) => void;
  readonly onUpdateExplanation: (explanation: string) => void;
  readonly onUpdateTaxonomy: (subjectId: string, chapterId: string) => void;
  readonly onApproveProposal: (type: 'subject' | 'chapter', name: string) => void;
  readonly onRunConsensus: () => void;
  readonly isVerifyingConsensus: boolean;
  readonly onInspectDuplication?: (item: ParsedQuestionItem) => void;
  readonly onSendToApprovalQueue?: (tempId: string) => void;
  readonly isCheckingDuplication: boolean;
  readonly subjectMetaMap: Record<string, { icon: string; badgeColor: string }>;
}

type CanvasTab = 'sba' | 'curriculum' | 'quorum' | 'qdd';

export const StagingDetailCanvas: React.FC<StagingDetailCanvasProps> = ({
  item,
  index,
  totalCount,
  isEditing,
  onToggleEdit,
  onDelete,
  onCopyPrompt,
  isPromptCopied,
  onToggleStemFormat,
  onUpdateStem,
  onUpdateChoice,
  onSetKeyedChoice,
  onUpdateExplanation,
  onUpdateTaxonomy,
  onApproveProposal,
  onRunConsensus,
  isVerifyingConsensus,
  onInspectDuplication,
  onSendToApprovalQueue,
  isCheckingDuplication,
  subjectMetaMap,
}) => {
  const [activeTab, setActiveTab] = useState<CanvasTab>('sba');
  const [isTaxonomyEditing, setIsTaxonomyEditing] = useState(false);

  const [isRationaleExpanded, setIsRationaleExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(
        'medquests_ai_parser_rationales_expanded'
      );
      if (stored !== null) return stored === 'true';
    } catch {
      // ignore
    }
    return true;
  });

  const toggleRationaleExpanded = (expand?: boolean) => {
    setIsRationaleExpanded((prev) => {
      const next = expand !== undefined ? expand : !prev;
      try {
        localStorage.setItem(
          'medquests_ai_parser_rationales_expanded',
          String(next)
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [isDuplicateBannerDismissed, setIsDuplicateBannerDismissed] =
    useState<boolean>(() => {
      try {
        return (
          localStorage.getItem(`medquests_dismissed_dup_${item.tempId}`) ===
          'true'
        );
      } catch {
        return false;
      }
    });

  const handleDismissDuplicateBanner = () => {
    setIsDuplicateBannerDismissed(true);
    try {
      localStorage.setItem(`medquests_dismissed_dup_${item.tempId}`, 'true');
    } catch {
      // ignore
    }
  };

  const blockPack = compositionRoot.catalog.get(item.question.blockId);
  const currentSubjects = blockPack
    ? blockPack.manifest.subjects.map((s) => ({
        id: s.id,
        name: typeof s.name === 'string' ? s.name : (s.name as { en?: string })?.en || s.id,
      }))
    : curriculumTaxonomyRegistry.getSubjects(item.question.blockId).map((s) => ({
        id: s.id,
        name: s.name,
      }));

  const classification = item.taxonomyClassification;
  const subjectMeta = TaxonomyDisplayResolver.resolveSubjectMeta(
    item.question.subjectId,
    subjectMetaMap
  );
  const displaySubjectName = TaxonomyDisplayResolver.resolveSubjectName(
    item.question.subjectId,
    classification?.subjectName,
    item.question.blockId
  );
  const displayChapterName = TaxonomyDisplayResolver.resolveChapterName(
    item.question.chapterId,
    classification?.chapterName,
    item.question.blockId
  );

  return (
    <article
      data-testid={`staging-card-${index}`}
      className="flex-1 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-lg flex flex-col overflow-hidden min-h-[580px] w-full"
    >
      {/* Canvas Top Bar */}
      <header className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-850/40 shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Question #{index + 1} of {totalCount}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${subjectMeta.badgeColor}`}
            >
              <span>{subjectMeta.icon}</span>
              <span className="truncate max-w-[130px]">
                {displaySubjectName}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              <span>📖</span>
              <span className="truncate max-w-[140px]" title={displayChapterName}>
                {displayChapterName}
              </span>
            </span>
            {item.isReclassified && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                title={`Reclassified from draft scope: ${item.originalDraftTaxonomy?.chapterName || item.originalDraftTaxonomy?.subjectName || 'Unmapped'}`}
              >
                <span>⚡</span>
                <span>Reclassified</span>
              </span>
            )}
            {classification?.newChapterProposal && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                title={`Will create new chapter: ${classification.newChapterProposal.name}`}
              >
                <span>✨</span>
                <span>Will Create New Chapter</span>
              </span>
            )}
            {classification?.newSubjectProposal && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                title={`Will create new subject: ${classification.newSubjectProposal.name}`}
              >
                <span>✨</span>
                <span>Will Create New Subject</span>
              </span>
            )}
          </div>
        </div>

        {/* Global Item Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCopyPrompt}
            title="Copy prompt for LLM inspection"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden sm:inline">
              {isPromptCopied ? 'Copied!' : 'Copy Prompt'}
            </span>
            <span className="sm:hidden">
              {isPromptCopied ? 'Copied' : 'Prompt'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleEdit}
            title={
              isEditing ? 'Save and close editing' : 'Edit question text inline'
            }
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isEditing
                ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-600'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            title="Remove question from queue"
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-rose-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Apple Segmented Tab Bar */}
      <nav
        aria-label="Question Inspector Views"
        className="px-4 py-2 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/70 dark:bg-zinc-850/50 flex items-center gap-1 overflow-x-auto apple-subtle-scrollbar shrink-0"
      >
        <button
          type="button"
          onClick={() => setActiveTab('sba')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'sba'
              ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-300 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Single-Best Answer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'curriculum'
              ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-300 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Curriculum Grounding</span>
          {classification?.isNewDomainSuggested && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quorum')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'quorum'
              ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-300 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Multi-Model Quorum</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qdd')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'qdd'
              ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-300 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Collision Audit (QDD)</span>
        </button>
      </nav>

      {/* Tab Content Panel */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 apple-subtle-scrollbar">
        {activeTab === 'sba' && (
          <CanvasSbaTab
            item={item}
            isEditing={isEditing}
            isDuplicateBannerDismissed={isDuplicateBannerDismissed}
            onDismissDuplicateBanner={handleDismissDuplicateBanner}
            isRationaleExpanded={isRationaleExpanded}
            onToggleRationaleExpanded={toggleRationaleExpanded}
            onToggleStemFormat={onToggleStemFormat}
            onUpdateStem={onUpdateStem}
            onUpdateChoice={onUpdateChoice}
            onSetKeyedChoice={onSetKeyedChoice}
            onUpdateExplanation={onUpdateExplanation}
            onInspectDuplication={onInspectDuplication}
            onSendToApprovalQueue={onSendToApprovalQueue}
          />
        )}

        {activeTab === 'curriculum' && (
          <CanvasCurriculumTab
            item={item}
            isTaxonomyEditing={isTaxonomyEditing}
            setIsTaxonomyEditing={setIsTaxonomyEditing}
            onApproveProposal={onApproveProposal}
            onUpdateTaxonomy={onUpdateTaxonomy}
            subjectMeta={subjectMeta}
            subjectMetaMap={subjectMetaMap}
            currentSubjects={currentSubjects}
          />
        )}

        {activeTab === 'quorum' && (
          <CanvasQuorumTab
            item={item}
            onRunConsensus={onRunConsensus}
            isVerifyingConsensus={isVerifyingConsensus}
          />
        )}

        {activeTab === 'qdd' && (
          <CanvasQddTab
            item={item}
            isCheckingDuplication={isCheckingDuplication}
            onInspectDuplication={onInspectDuplication}
          />
        )}
      </div>
    </article>
  );
};
