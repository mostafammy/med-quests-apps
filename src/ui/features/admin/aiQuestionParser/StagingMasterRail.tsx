/**
 * StagingMasterRail
 * Design System: Apple Human Interface Guidelines (macOS Stage Manager / Split View Rail)
 *
 * Left-side navigation rail displaying staged questions as compact, interactive cards.
 * Prevents vertical scroll fatigue by letting the user jump directly between questions.
 */

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Search,
  AlertTriangle,
  Check,
  ChevronRight,
} from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../domain/questionBank/aiQuestionParser/types.ts';
import { DuplicateBadge } from '../../qdd/DuplicateBadge.tsx';
import { TaxonomyDisplayResolver } from '../../../../domain/taxonomy/TaxonomyDisplayResolver.ts';

interface StagingMasterRailProps {
  readonly questions: ParsedQuestionItem[];
  readonly selectedIndex: number;
  readonly onSelectIndex: (index: number) => void;
  readonly selectedTempIds: Set<string>;
  readonly onToggleSelect: (tempId: string) => void;
  readonly isCheckingDuplication: boolean;
  readonly onInspectDuplication?: (item: ParsedQuestionItem) => void;
  readonly subjectMetaMap: Record<string, { icon: string; badgeColor: string }>;
}

export const StagingMasterRail: React.FC<StagingMasterRailProps> = ({
  questions,
  selectedIndex,
  onSelectIndex,
  selectedTempIds,
  onToggleSelect,
  isCheckingDuplication,
  onInspectDuplication,
  subjectMetaMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'inferred' | 'duplicates' | 'reclassified' | 'proposals'>('all');

  const filteredQuestions = useMemo(() => {
    return questions.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
      // Filter mode check
      if (filterMode === 'inferred' && !item.aiGeneratedAnswerKey) return false;
      if (filterMode === 'duplicates' && (!item.qddVerdict || item.qddVerdict.relation === 'UNIQUE')) return false;
      if (filterMode === 'reclassified' && !item.isReclassified) return false;
      if (filterMode === 'proposals' && !item.taxonomyClassification?.newChapterProposal && !item.taxonomyClassification?.newSubjectProposal) return false;

      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const displaySubject = TaxonomyDisplayResolver.resolveSubjectName(
          item.question.subjectId,
          item.taxonomyClassification?.subjectName,
          item.question.blockId
        );
        const displayChapter = TaxonomyDisplayResolver.resolveChapterName(
          item.question.chapterId,
          item.taxonomyClassification?.chapterName,
          item.question.blockId
        );
        const stemMatches = item.question.stem.toLowerCase().includes(query);
        const subjectMatches =
          item.question.subjectId.toLowerCase().includes(query) ||
          displaySubject.toLowerCase().includes(query);
        const chapterMatches =
          item.question.chapterId.toLowerCase().includes(query) ||
          displayChapter.toLowerCase().includes(query);
        const choicesMatch = item.question.choices.some((c) => c.text.toLowerCase().includes(query));
        return stemMatches || subjectMatches || chapterMatches || choicesMatch;
      }

      return true;
    });
  }, [questions, filterMode, searchQuery]);

  return (
    <nav
      aria-label="Staged Questions Navigation Rail"
      className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg overflow-hidden h-[540px] lg:h-[720px]"
    >
      {/* Header & Filter Controls */}
      <div className="p-3.5 border-b border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5 shrink-0 bg-white/50 dark:bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold font-heading text-zinc-900 dark:text-zinc-100">
              Questions Rail
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
              {filteredQuestions.length} of {questions.length}
            </span>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('reclassified')}
              title="Show only questions reclassified from draft scope by AI"
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                filterMode === 'reclassified'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-indigo-600'
              }`}
            >
              ⚡ Reclassified
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('proposals')}
              title="Show only questions that will create a new chapter or subject"
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                filterMode === 'proposals'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-purple-600'
              }`}
            >
              ✨ Proposals
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('inferred')}
              title="Show only questions where AI deduced missing key"
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                filterMode === 'inferred'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-amber-600'
              }`}
            >
              AI Keys
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('duplicates')}
              title="Show only questions with collision or duplicate warnings"
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                filterMode === 'duplicates'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-zinc-500 hover:text-rose-600'
              }`}
            >
              Conflicts
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stems, choices, chapters…"
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Scrollable Questions List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 apple-subtle-scrollbar">
        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No matching questions found
          </div>
        ) : (
          filteredQuestions.map(({ item, originalIndex }) => {
            const isSelected = selectedIndex === originalIndex;
            const isChecked = selectedTempIds.has(item.tempId);
            const subjectMeta = TaxonomyDisplayResolver.resolveSubjectMeta(
              item.question.subjectId,
              subjectMetaMap
            );
            const displaySubjectName = TaxonomyDisplayResolver.resolveSubjectName(
              item.question.subjectId,
              item.taxonomyClassification?.subjectName,
              item.question.blockId
            );
            const displayChapterName = TaxonomyDisplayResolver.resolveChapterName(
              item.question.chapterId,
              item.taxonomyClassification?.chapterName,
              item.question.blockId
            );

            return (
              <div
                key={item.tempId}
                onClick={() => onSelectIndex(originalIndex)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative group apple-spring-transform ${
                  isSelected
                    ? 'bg-purple-500/10 dark:bg-purple-950/30 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                    : 'bg-white/80 dark:bg-zinc-850/80 border-zinc-200/70 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Header: Checkbox + Number + Subject + Arrow */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(item.tempId);
                      }}
                      className="cursor-pointer text-purple-600 dark:text-purple-400 p-0.5"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </button>

                    <span className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      #{originalIndex + 1}
                    </span>

                    {/* Subject Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${subjectMeta.badgeColor}`}
                    >
                      <span>{subjectMeta.icon}</span>
                      <span className="truncate max-w-[95px]">{displaySubjectName}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Confidence */}
                    <span className="text-[9px] font-mono font-semibold text-zinc-400">
                      {item.taxonomyClassification?.confidenceScore || 95}%
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-purple-500 translate-x-0.5' : 'text-zinc-400 opacity-60'
                      }`}
                    />
                  </div>
                </div>

                {/* Question Stem Excerpt */}
                <p className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-relaxed">
                  {item.question.stem}
                </p>

                {/* Footer Badges */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[9px]">
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* Reclassification Badge */}
                    {item.isReclassified && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                        title={`Reclassified from draft: ${item.originalDraftTaxonomy?.chapterName || 'Unmapped'}`}
                      >
                        ⚡ Reclassified
                      </span>
                    )}

                    {/* New Chapter Proposal Badge */}
                    {item.taxonomyClassification?.newChapterProposal && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                        title={`Will create new chapter: ${item.taxonomyClassification.newChapterProposal.name}`}
                      >
                        ✨ New Chapter
                      </span>
                    )}

                    {/* New Subject Proposal Badge */}
                    {item.taxonomyClassification?.newSubjectProposal && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                        title={`Will create new subject: ${item.taxonomyClassification.newSubjectProposal.name}`}
                      >
                        ✨ New Subject
                      </span>
                    )}

                    {/* Inferred vs Verified Key Badge */}
                    {item.aiGeneratedAnswerKey ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                        AI Key
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                        Author Key
                      </span>
                    )}

                    {/* QDD Badge */}
                    <DuplicateBadge
                      verdict={item.qddVerdict}
                      isChecking={isCheckingDuplication || item.isCheckingDuplication}
                      onInspect={() => onInspectDuplication?.(item)}
                    />
                  </div>

                  {/* Chapter name snippet */}
                  <span className="text-zinc-400 truncate max-w-[110px]" title={displayChapterName}>
                    {displayChapterName}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </nav>
  );
};
