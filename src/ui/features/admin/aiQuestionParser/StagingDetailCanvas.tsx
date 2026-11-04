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
  ShieldAlert,
  AlertOctagon,
  Check,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sliders,
  FolderPlus,
  Info,
  ExternalLink,
  Send,
  X,
} from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../domain/questionBank/aiQuestionParser/types.ts';
import type { ChoiceId } from '../../../../domain/model/types.ts';
import { curriculumTaxonomyRegistry } from '../../../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { DuplicateBadge } from '../../qdd/DuplicateBadge.tsx';

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
  readonly onUpdateChoice: (choiceId: ChoiceId, text: string, rationale: string) => void;
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

  // Remember rationales expanded/collapsed state across questions and re-renders
  const [isRationaleExpanded, setIsRationaleExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('medquests_ai_parser_rationales_expanded');
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
        localStorage.setItem('medquests_ai_parser_rationales_expanded', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Allow user to dismiss/collapse the duplicate warning banner and remember it
  const [isDuplicateBannerDismissed, setIsDuplicateBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`medquests_dismissed_dup_${item.tempId}`) === 'true';
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

  const classification = item.taxonomyClassification;
  const currentSubjects = curriculumTaxonomyRegistry.getSubjects();
  const subjectMeta = subjectMetaMap[item.question.subjectId] || {
    icon: '📚',
    badgeColor: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
  };

  return (
    <article
      aria-label={`Question ${index + 1} of ${totalCount} Detail Canvas`}
      className="flex-1 flex flex-col bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg overflow-hidden min-h-[540px] lg:h-[720px]"
    >
      {/* Top Header of Selected Question */}
      <header className="p-4 sm:p-5 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Question #{index + 1} of {totalCount}
          </span>

          {/* AI Inferred vs Verified Key Pill */}
          {item.aiGeneratedAnswerKey ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Answer Key Inferred by AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <Check className="w-3 h-3 text-emerald-500" />
              Author Key Verified
            </span>
          )}

          {/* QDD Duplicate Badge */}
          <DuplicateBadge
            verdict={item.qddVerdict}
            isChecking={isCheckingDuplication || item.isCheckingDuplication}
            onInspect={() => onInspectDuplication?.(item)}
          />

          {/* Subject Breadcrumb */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${subjectMeta.badgeColor}`}
          >
            <span>{subjectMeta.icon}</span>
            <span className="capitalize">{item.question.subjectId}</span>
          </span>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2">
          {/* Copy Prompt */}
          <button
            type="button"
            onClick={onCopyPrompt}
            title="Copy Verification Prompt for Cross-Testing with ChatGPT or Claude (Includes Block, Subject, & Chapter Grounding)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all cursor-pointer shadow-2xs"
          >
            {isPromptCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-purple-500" />
            )}
            <span className="hidden sm:inline">
              {isPromptCopied ? 'Copied with Scope!' : 'Copy Verification Prompt'}
            </span>
            <span className="sm:hidden">{isPromptCopied ? 'Copied' : 'Prompt'}</span>
          </button>

          {/* Edit Toggle */}
          <button
            type="button"
            onClick={onToggleEdit}
            title={isEditing ? 'Save and close editing' : 'Edit question text inline'}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isEditing
                ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-600'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Delete */}
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
        {/* ==================== TAB 1: SINGLE-BEST ANSWER ==================== */}
        {activeTab === 'sba' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* PROMINENT BANK DUPLICATE / CONFLICT ALERT BANNER */}
            {(() => {
              const rel = item.qddVerdict?.relation;
              const isDuplicateOrConflict = rel === 'EXACT' || rel === 'NEAR' || rel === 'CONFLICT';
              if (!isDuplicateOrConflict || isDuplicateBannerDismissed) return null;

              const isExact = rel === 'EXACT';
              const isConflict = rel === 'CONFLICT';
              const firstCand = item.qddVerdict?.candidates[0];
              const matchPercent = firstCand?.signals?.lexicalJaccard
                ? Math.round(firstCand.signals.lexicalJaccard * 100)
                : 100;

              return (
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isConflict
                      ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/40 text-rose-900 dark:text-rose-200 shadow-sm'
                      : isExact
                      ? 'bg-blue-500/10 dark:bg-blue-950/30 border-blue-500/40 text-blue-900 dark:text-blue-200 shadow-sm'
                      : 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          isConflict
                            ? 'bg-rose-600 text-white'
                            : isExact
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isConflict ? (
                          <AlertOctagon className="w-5 h-5" />
                        ) : isExact ? (
                          <ShieldAlert className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-wider">
                            {isConflict
                              ? 'Answer Contradiction with Existing Question'
                              : isExact
                              ? 'Question Already Exists in Global Bank'
                              : 'Likely Duplicate / High Content Overlap'}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                              isConflict
                                ? 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40'
                                : isExact
                                ? 'bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/40'
                                : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40'
                            }`}
                          >
                            Direct Commit Locked • Approval Required
                          </span>
                        </div>
                        <p className="text-xs mt-1 opacity-90 leading-relaxed">
                          {isConflict
                            ? `Identical question stem exists in the Global Bank, but the correct keyed answer contradicts bank item ${firstCand?.matchedQuestionId || ''}. Cannot be directly committed.`
                            : isExact
                            ? `Matches canonical bank question ${firstCand?.matchedQuestionId || ''} (${matchPercent}% lexical match). Held from bank commit to prevent duplication.`
                            : `High similarity (${matchPercent}%) detected with bank question ${firstCand?.matchedQuestionId || ''}.`}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {onInspectDuplication && (
                        <button
                          type="button"
                          onClick={() => onInspectDuplication(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs transition-all cursor-pointer"
                        >
                          <Scale className="w-3.5 h-3.5 text-purple-500" />
                          <span>Compare Diff</span>
                        </button>
                      )}

                      {onSendToApprovalQueue && (
                        <button
                          type="button"
                          onClick={() => onSendToApprovalQueue(item.tempId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send for Approval</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleDismissDuplicateBanner}
                        title="Dismiss warning (stays collapsed)"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Stem Header & Mode Switcher */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Question Stem
                </span>
                {item.originalRawStem && item.question.stem !== item.originalRawStem && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    USMLE Vignette Active
                  </span>
                )}
                {item.originalRawStem && item.question.stem === item.originalRawStem && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                    Verbatim Raw Stem
                  </span>
                )}
              </div>

              {(item.originalRawStem || item.enrichedVignetteStem) && (
                <button
                  type="button"
                  onClick={onToggleStemFormat}
                  title="Switch between author's original verbatim question and USMLE clinical vignette"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {item.originalRawStem && item.question.stem === item.originalRawStem
                      ? 'Switch to USMLE Vignette'
                      : 'Revert to Original Raw Text'}
                  </span>
                </button>
              )}
            </div>

            {/* Stem Text Body */}
            {isEditing ? (
              <textarea
                rows={3}
                value={item.question.stem}
                onChange={(e) => onUpdateStem(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 transition-all shadow-inner leading-relaxed"
              />
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800 text-xs sm:text-sm font-medium text-zinc-850 dark:text-zinc-150 leading-relaxed">
                {item.question.stem}
              </div>
            )}

            {/* 4 Choices Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Four-Choice Single Best Answer Options</span>
                <span>Difficulty {item.question.difficulty}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {item.question.choices.map((c) => {
                  const isCorrect = c.isCorrect;
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 shadow-xs'
                          : 'bg-white/80 dark:bg-zinc-850/60 border-zinc-200/70 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {c.id.toUpperCase()}
                          </span>

                          {isEditing ? (
                            <input
                              type="text"
                              value={c.text}
                              onChange={(e) => onUpdateChoice(c.id as ChoiceId, e.target.value, c.rationale)}
                              className="text-xs p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex-1 font-medium"
                            />
                          ) : (
                            <span className="text-xs font-semibold leading-relaxed break-words">
                              {c.text}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => onSetKeyedChoice(c.id as ChoiceId)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {isCorrect ? 'Correct Key' : 'Set as Key'}
                            </button>
                          ) : (
                            isCorrect && (
                              <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                Keyed Answer
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Rationale Display */}
                      {isRationaleExpanded && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-750/50 text-[11px] text-zinc-600 dark:text-zinc-400">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                            Rationale:
                          </span>{' '}
                          {isEditing ? (
                            <textarea
                              rows={2}
                              value={c.rationale}
                              onChange={(e) => onUpdateChoice(c.id as ChoiceId, c.text, e.target.value)}
                              className="w-full text-xs p-1.5 mt-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            />
                          ) : (
                            c.rationale || 'No distractor rationale available.'
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distractor Rationales & Pathophysiology Explanation */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => toggleRationaleExpanded()}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  {isRationaleExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Hide Distractor Rationales & Explanation</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Inspect Distractor Rationales & Explanation</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] text-zinc-400 font-mono">
                  Concept: {item.question.concept || 'Cardiovascular Pathology'}
                </span>
              </div>

              {isRationaleExpanded && (
                <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-850/60 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-purple-500" />
                    <span>Clinical Explanation & Pathophysiology</span>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={item.question.explanation}
                      onChange={(e) => onUpdateExplanation(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium"
                    />
                  ) : (
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {item.question.explanation}
                    </p>
                  )}

                  {item.question.evidence && item.question.evidence[0] && (
                    <div className="text-[10px] text-zinc-400 italic pt-1 border-t border-zinc-200/50 dark:border-zinc-750/50">
                      Grounding: {item.question.evidence[0].sourceName} ({item.question.evidence[0].location})
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: CURRICULUM ALIGNMENT ==================== */}
        {activeTab === 'curriculum' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header Box */}
            <div className="p-4 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-cyan-500/5 dark:from-purple-950/20 dark:via-zinc-900/40 dark:to-cyan-950/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-purple-200/50 dark:border-purple-800/40 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                    Autonomous Curriculum Auto-Classifier Result
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {classification?.confidenceScore || 95}% Match Confidence
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTaxonomyEditing(!isTaxonomyEditing)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{isTaxonomyEditing ? 'Close Re-Assignment' : 'Re-Assign Taxonomy'}</span>
                </button>
              </div>

              {/* 3-Pill Taxonomy Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Target Block */}
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <span>Target Block</span>
                    <span className="text-xs">🫀</span>
                  </div>
                  <div
                    className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate"
                    title={classification?.blockName || 'Cardiovascular System (CVS) - Block 206'}
                  >
                    {classification?.blockName || 'Cardiovascular System (CVS) - Block 206'}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Integrated Organ System
                  </div>
                </div>

                {/* 2. Target Subject */}
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <span>Target Subject</span>
                    <span className="text-xs">{subjectMeta.icon}</span>
                  </div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate capitalize">
                    {classification?.subjectName || item.question.subjectId}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Academic Discipline
                  </div>
                </div>

                {/* 3. Target Chapter */}
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <span>Target Chapter</span>
                    <span className="text-xs">📖</span>
                  </div>
                  <div
                    className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate"
                    title={classification?.chapterName || item.question.chapterId}
                  >
                    {classification?.chapterName || item.question.chapterId}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Curriculum Syllabus Topic
                  </div>
                </div>
              </div>

              {/* Classification Evidence */}
              {classification?.rationale && (
                <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400 bg-white/60 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50">
                  <Info className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">Classification Evidence: </strong>
                    {classification.rationale}
                  </div>
                </div>
              )}

              {/* Proposed Curriculum Expansion Alert */}
              {classification?.isNewDomainSuggested && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Proposed Curriculum Expansion</div>
                      <div className="text-[11px] opacity-90">{classification.rationale}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {classification.newSubjectProposal && (
                      <button
                        type="button"
                        onClick={() => onApproveProposal('subject', classification.newSubjectProposal!.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs cursor-pointer transition-all"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Approve Subject</span>
                      </button>
                    )}
                    {classification.newChapterProposal && (
                      <button
                        type="button"
                        onClick={() => onApproveProposal('chapter', classification.newChapterProposal!.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xs cursor-pointer transition-all"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Approve Chapter</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Inline Re-assignment Drawer */}
              {isTaxonomyEditing && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-700/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Reassign Subject
                    </label>
                    <select
                      value={item.question.subjectId}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        const firstChap = curriculumTaxonomyRegistry.getChapters(newSub)[0]?.id || 'cvs-ana-heart-mediastinum';
                        onUpdateTaxonomy(newSub, firstChap);
                      }}
                      className="w-full text-xs mt-1 p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 font-medium"
                    >
                      {currentSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {subjectMetaMap[s.id]?.icon || '📚'} {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Reassign Chapter
                    </label>
                    <select
                      value={item.question.chapterId}
                      onChange={(e) => {
                        onUpdateTaxonomy(item.question.subjectId, e.target.value);
                      }}
                      className="w-full text-xs mt-1 p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 font-medium"
                    >
                      {curriculumTaxonomyRegistry.getChapters(item.question.subjectId).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: MULTI-MODEL QUORUM ==================== */}
        {activeTab === 'quorum' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {item.consensusSummary ? (
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Scale className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Multi-Model Quorum Consensus
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.consensusSummary.consensusVerdict === 'unanimous_agreement'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                          : item.consensusSummary.consensusVerdict === 'majority_consensus'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                      }`}
                    >
                      {item.consensusSummary.consensusVerdict === 'unanimous_agreement' && '✅ 100% Unanimous Agreement'}
                      {item.consensusSummary.consensusVerdict === 'majority_consensus' && `✨ Majority Quorum (${Math.round(item.consensusSummary.agreementRatio * 100)}%)`}
                      {item.consensusSummary.consensusVerdict === 'discrepancy_detected' && '⚠️ Model Discrepancy Detected'}
                      {item.consensusSummary.consensusVerdict === 'insufficient_quorum' && 'Quorum Undetermined'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onRunConsensus}
                    disabled={isVerifyingConsensus}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isVerifyingConsensus ? 'animate-spin' : ''}`} />
                    <span>{isVerifyingConsensus ? 'Re-checking Quorum…' : 'Re-verify with Ensemble'}</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.consensusSummary.consensusRationale}
                </p>

                {/* Model Verdicts Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                  {item.consensusSummary.modelVerdicts.map((v) => {
                    const isSuccess = v.status === 'success';
                    const isConsensusWinner = isSuccess && v.selectedChoiceId === item.consensusSummary?.consensusChoiceId;
                    return (
                      <div
                        key={v.modelId}
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-1.5 ${
                          !isSuccess
                            ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 opacity-80'
                            : isConsensusWinner
                            ? 'bg-white dark:bg-zinc-800 border-emerald-500/40 shadow-2xs ring-1 ring-emerald-500/20'
                            : 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {v.modelName}
                          </span>
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              !isSuccess
                                ? 'bg-rose-500/10 text-rose-600'
                                : isConsensusWinner
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700'
                            }`}
                          >
                            Choice {v.selectedChoiceId?.toUpperCase() || '—'}
                          </span>
                        </div>

                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {v.clinicalRationale || v.errorMessage || 'No critique supplied.'}
                        </p>

                        <div className="text-[9px] font-mono text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-750">
                          Latency: {v.latencyMs}ms
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
                <Scale className="w-8 h-8 text-purple-400 mx-auto" />
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Multi-Model Cross-Examination Ensemble was skipped for fast ingestion.
                </div>
                <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                  You can trigger on-demand consensus to query Gemini, Claude, and DeepSeek concurrently to detect any potential distractor hallucinations.
                </p>
                <button
                  type="button"
                  onClick={onRunConsensus}
                  disabled={isVerifyingConsensus}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isVerifyingConsensus ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingConsensus ? 'Executing Ensemble Check…' : 'Cross-Examine with Quorum'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: COLLISION AUDIT (QDD) ==================== */}
        {activeTab === 'qdd' && (
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
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Audited Bank Scope:</span>
                    <span className="text-zinc-500">220+ Canonical Bank Items</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Relation Verdict:</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                      {item.qddVerdict.relation}
                    </span>
                  </div>
                  {item.qddVerdict.candidates.length > 0 && item.qddVerdict.candidates[0] && (
                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-1">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">
                        Matched Canonical Item ({item.qddVerdict.candidates[0].matchedQuestionId})
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
                  No duplication analysis record found. The item will be audited against the bank before committing.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
