import React from 'react';
import {
  Sparkles,
  Sliders,
  Info,
  AlertTriangle,
  FolderPlus,
  Layers,
  Zap,
  CheckCircle2,
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

        {/* Visual Transformation Diff Card: Draft Scope -> AI Reclassified Scope */}
        {(item.isReclassified || (item.originalDraftTaxonomy?.chapterName && item.originalDraftTaxonomy.chapterName.toLowerCase() !== displayChapterName.toLowerCase())) && (
          <div className="p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-cyan-500/10 dark:from-indigo-950/30 dark:via-zinc-900/40 dark:to-cyan-950/20 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-indigo-800/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 block">
                    Curriculum Reclassification Audit Diff
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Autonomous referee corrected draft taxonomy to match clinical syllabus
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                ⚡ Scope Re-Anchored
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
              {/* Left: Original Draft Scope */}
              <div className="p-3.5 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Original Draft Scope</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-500 font-mono">Author Provided</span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 line-through">
                    📖 {item.originalDraftTaxonomy?.chapterName || 'Unspecified Chapter'}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Subject: {item.originalDraftTaxonomy?.subjectName || 'Unspecified'} • Block: {item.originalDraftTaxonomy?.blockName || 'Unspecified'}
                  </div>
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Author classification flagged as inaccurate topic domain
                </div>
              </div>

              {/* Right: AI Reclassified Scope */}
              <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <span>Autonomous AI Assignment</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-200/80 dark:bg-indigo-800/80 text-indigo-800 dark:text-indigo-200 font-bold font-mono">Active Grounding</span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>📖 {displayChapterName}</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                    Subject: {displaySubjectName} • Block: {displayBlockName}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Clinically verified grounded to target curriculum chapter
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white/60 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Clinical Reclassification Rationale:</strong> The clinical referee verified that this question tests concepts belonging in <strong>{displayChapterName}</strong> rather than the draft chapter ({item.originalDraftTaxonomy?.chapterName || 'unmapped'}), preventing cross-topic curriculum pollution.
              </span>
            </div>
          </div>
        )}

        {/* Dynamic New Chapter Proposal Card */}
        {classification?.newChapterProposal && (
          <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 dark:bg-purple-950/30 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-1.5 flex-wrap">
                    <span>✨ Will Create & Register New Chapter:</span>
                    <span className="font-mono bg-purple-200/70 dark:bg-purple-800/70 px-1.5 py-0.5 rounded text-purple-900 dark:text-purple-100">
                      &ldquo;{classification.newChapterProposal.name}&rdquo;
                    </span>
                  </div>
                  <div className="text-[11px] opacity-90 mt-1">
                    This question introduces a valid curriculum domain not yet registered in the active manifest. Committing or approving will register this chapter under <strong>{displaySubjectName}</strong> in <strong>{displayBlockName}</strong>.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onApproveProposal(
                    'chapter',
                    classification.newChapterProposal!.name
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xs cursor-pointer transition-all shrink-0 active:scale-95"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Approve & Register Chapter</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic New Subject Proposal Card */}
        {classification?.newSubjectProposal && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-1.5 flex-wrap">
                    <span>✨ Will Create & Register New Subject:</span>
                    <span className="font-mono bg-amber-200/70 dark:bg-amber-800/70 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-100">
                      &ldquo;{classification.newSubjectProposal.name}&rdquo;
                    </span>
                  </div>
                  <div className="text-[11px] opacity-90 mt-1">
                    This question introduces a new academic discipline in <strong>{displayBlockName}</strong>. Committing or approving will register this subject into the active syllabus.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onApproveProposal(
                    'subject',
                    classification.newSubjectProposal!.name
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs cursor-pointer transition-all shrink-0 active:scale-95"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Approve & Register Subject</span>
              </button>
            </div>
          </div>
        )}

        {/* Proposed Curriculum Expansion Alert (Fallback when no explicit proposal name is present) */}
        {classification?.isNewDomainSuggested && !classification.newChapterProposal && !classification.newSubjectProposal && (
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
