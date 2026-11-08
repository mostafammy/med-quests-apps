import React from 'react';
import {
  Sparkles,
  Sliders,
  Info,
  AlertTriangle,
  FolderPlus,
  Layers,
} from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../../domain/questionBank/aiQuestionParser/types.ts';
import { curriculumTaxonomyRegistry } from '../../../../../domain/taxonomy/CurriculumTaxonomyRegistry.ts';
import { TaxonomyDisplayResolver } from '../../../../../domain/taxonomy/TaxonomyDisplayResolver.ts';

interface CanvasCurriculumTabProps {
  readonly item: ParsedQuestionItem;
  readonly isTaxonomyEditing: boolean;
  readonly setIsTaxonomyEditing: (val: boolean) => void;
  readonly onApproveProposal: (type: 'subject' | 'chapter', name: string) => void;
  readonly onUpdateTaxonomy: (subjectId: string, chapterId: string) => void;
  readonly subjectMeta: { icon: string; badgeColor: string };
  readonly subjectMetaMap: Record<string, { icon: string; badgeColor: string }>;
  readonly currentSubjects: readonly { id: string; name: string }[];
}

export const CanvasCurriculumTab: React.FC<CanvasCurriculumTabProps> = ({
  item,
  isTaxonomyEditing,
  setIsTaxonomyEditing,
  onApproveProposal,
  onUpdateTaxonomy,
  subjectMeta: _subjectMeta,
  subjectMetaMap,
  currentSubjects,
}) => {
  const classification = item.taxonomyClassification;
  const displayBlockName = classification?.blockName
    ? TaxonomyDisplayResolver.humanizeTaxonomySlug(classification.blockName)
    : 'Cardiovascular System (CVS) - Block 206';
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
  const subjectMetaResolved = TaxonomyDisplayResolver.resolveSubjectMeta(
    item.question.subjectId,
    subjectMetaMap
  );

  return (
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
            <span>
              {isTaxonomyEditing ? 'Close Re-Assignment' : 'Re-Assign Taxonomy'}
            </span>
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
              title={displayBlockName}
            >
              {displayBlockName}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Integrated Organ System
            </div>
          </div>

          {/* 2. Target Subject */}
          <div className="p-3.5 rounded-xl bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <span>Target Subject</span>
              <span className="text-xs">{subjectMetaResolved.icon}</span>
            </div>
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={displaySubjectName}>
              {displaySubjectName}
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
              title={displayChapterName}
            >
              {displayChapterName}
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
              <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">
                Classification Evidence:{' '}
              </strong>
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
                <div className="text-[11px] opacity-90">
                  {classification.rationale}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {classification.newSubjectProposal && (
                <button
                  type="button"
                  onClick={() =>
                    onApproveProposal(
                      'subject',
                      classification.newSubjectProposal!.name
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs cursor-pointer transition-all"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Approve Subject</span>
                </button>
              )}
              {classification.newChapterProposal && (
                <button
                  type="button"
                  onClick={() =>
                    onApproveProposal(
                      'chapter',
                      classification.newChapterProposal!.name
                    )
                  }
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
                  const firstChap =
                    curriculumTaxonomyRegistry.getChapters(newSub)[0]?.id ||
                    'cvs-ana-heart-mediastinum';
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
                className="w-full text-xs mt-1 p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-855 font-medium"
              >
                {curriculumTaxonomyRegistry
                  .getChapters(item.question.subjectId)
                  .map((c) => (
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
  );
};
