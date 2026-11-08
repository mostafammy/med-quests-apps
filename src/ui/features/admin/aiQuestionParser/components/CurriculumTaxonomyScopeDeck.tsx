import React from 'react';
import {
  Cpu,
  Sparkles,
  Sliders,
  ChevronDown,
  BookOpen,
  Scale,
} from 'lucide-react';
import type { ModelOption } from './ModelSelectionModal.tsx';
import { TaxonomyDisplayResolver } from '../../../../../domain/taxonomy/TaxonomyDisplayResolver.ts';

interface SubjectItem {
  id: string;
  name: string;
}

interface ChapterItem {
  id: string;
  name: string;
}

interface BlockSummary {
  code?: string;
  shortName?: string;
  status?: string;
  name?: unknown;
  id?: string;
  [key: string]: unknown;
}

interface CurriculumTaxonomyScopeDeckProps {
  readonly activeModel: ModelOption;
  readonly onOpenModelModal: () => void;
  readonly isParsing: boolean;
  readonly targetBlockId: string;
  readonly targetSubjectId: string;
  readonly targetChapterId: string;
  readonly setTargetTaxonomy: (subjectId: string, chapterId: string) => void;
  readonly activeBlock?: BlockSummary | null;
  readonly globalActiveBlockId: string;
  readonly currentSubjects: readonly SubjectItem[];
  readonly currentChapters: readonly ChapterItem[];
  readonly stemMode: 'verbatim' | 'vignette';
  readonly setStemMode: (mode: 'verbatim' | 'vignette') => void;
  readonly enableConsensusCheck: boolean;
  readonly setEnableConsensusCheck: (enable: boolean) => void;
  readonly subjectMetaMap: Record<string, { icon: string; badgeColor: string }>;
}

export const CurriculumTaxonomyScopeDeck: React.FC<
  CurriculumTaxonomyScopeDeckProps
> = ({
  activeModel,
  onOpenModelModal,
  isParsing,
  targetSubjectId,
  targetChapterId,
  setTargetTaxonomy,
  activeBlock,
  globalActiveBlockId,
  currentSubjects,
  currentChapters,
  stemMode,
  setStemMode,
  enableConsensusCheck,
  setEnableConsensusCheck,
  subjectMetaMap,
}) => {
  const isAutoCurriculumMode =
    targetSubjectId === 'auto' || targetSubjectId === 'all';

  return (
    <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-lg space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            AI Reasoning Engine & Dynamic Curriculum Targeting
          </h2>
        </div>
        <span className="text-[11px] text-zinc-400 font-medium font-mono">
          Apple HIG Cupertino Deck
        </span>
      </div>

      {/* 2-Column Responsive Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Section 1: AI Reasoning Model Card (Col 5) */}
        <div className="lg:col-span-5 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Active Reasoning Model
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {activeModel.speed}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {activeModel.name}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {activeModel.description}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-mono">
              Provider: {activeModel.providerName}
            </span>
            <button
              type="button"
              onClick={onOpenModelModal}
              disabled={isParsing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-500" />
              <span>Switch Model</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Section 2: Curriculum Taxonomy Targeting Deck (Col 7) */}
        <div className="lg:col-span-7 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Curriculum Scope & Classification Mode
            </span>

            {/* Apple Segmented Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setTargetTaxonomy('auto', 'auto')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isAutoCurriculumMode
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>AI Auto-Classify</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setTargetTaxonomy(currentSubjects[0]?.id || 'anatomy', 'all')
                }
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isAutoCurriculumMode
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Manual Scope</span>
              </button>
            </div>
          </div>

          {/* Active Curriculum Block */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Target Curriculum Block
              </label>
              <span className="text-[10px] text-zinc-400 font-medium">
                Controlled via Navbar Switcher
              </span>
            </div>
            <div
              data-testid="ai-parser-active-block-pill"
              className="w-full text-xs rounded-xl border border-purple-200/80 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 px-3 py-2 text-purple-900 dark:text-purple-200 font-bold flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-md bg-purple-200/80 dark:bg-purple-800/60 text-[10px] uppercase font-black text-purple-950 dark:text-purple-100">
                  {activeBlock?.code || globalActiveBlockId.toUpperCase()}
                </span>
                <span>
                  {activeBlock?.shortName ||
                    activeBlock?.code ||
                    globalActiveBlockId.toUpperCase()}
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase font-semibold">
                {activeBlock?.status || 'Active'}
              </span>
            </div>
          </div>

          {isAutoCurriculumMode ? (
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Autonomous Curriculum Mapping & Gap Analysis
                  </span>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/15 px-2 py-0.2 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  The AI dynamically inspects each clinical vignette and assigns
                  the exact Subject & Chapter from our registered curriculum. If a
                  question addresses unmapped medical territory, the AI proposes a
                  formal curriculum expansion.
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {currentSubjects.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/70 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                    >
                      <span>{TaxonomyDisplayResolver.resolveSubjectMeta(s.id, subjectMetaMap).icon}</span>
                      <span>{s.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Subject Scope
                </label>
                <select
                  value={targetSubjectId}
                  onChange={(e) => setTargetTaxonomy(e.target.value, 'all')}
                  disabled={isParsing}
                  className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  {currentSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {TaxonomyDisplayResolver.resolveSubjectMeta(s.id, subjectMetaMap).icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Chapter Scope
                </label>
                <select
                  value={targetChapterId}
                  onChange={(e) =>
                    setTargetTaxonomy(targetSubjectId, e.target.value)
                  }
                  disabled={isParsing}
                  className="w-full text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  <option value="all">
                    All Chapters in{' '}
                    {TaxonomyDisplayResolver.resolveSubjectName(targetSubjectId)}
                  </option>
                  {currentChapters.map((c) => (
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

      {/* Section 3: Question Stem Fidelity & Formatting Policy */}
      <div className="p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Question Stem Fidelity
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {stemMode === 'verbatim'
                ? 'Strict Author Fidelity'
                : 'USMLE Case Study'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {stemMode === 'verbatim'
              ? 'Preserves the author’s exact question wording directly (best for faculty tests & direct recall).'
              : 'Enriches dry recall questions into patient presentation vignettes (best for USMLE Step 1 practice).'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setStemMode('verbatim')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              stemMode === 'verbatim'
                ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            📄 Verbatim (Faithful)
          </button>
          <button
            type="button"
            onClick={() => setStemMode('vignette')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              stemMode === 'vignette'
                ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            🏥 USMLE Vignette
          </button>
        </div>
      </div>

      {/* Section 4: Multi-Model Consensus Verification Policy */}
      <div className="p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Multi-Model Accuracy Check
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                enableConsensusCheck
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
              }`}
            >
              {enableConsensusCheck
                ? 'Multi-Model Quorum Active'
                : 'Single Engine Pass'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {enableConsensusCheck
              ? 'Concurrently queries Gemini, Claude 3.7, DeepSeek R1, and Referee to cross-verify answers and detect hallucinations.'
              : 'Fast parsing with primary model. You can still cross-examine individual questions on demand in the inspection queue.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setEnableConsensusCheck(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !enableConsensusCheck
                ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            ⚡ Fast (Single Engine)
          </button>
          <button
            type="button"
            onClick={() => setEnableConsensusCheck(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              enableConsensusCheck
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>⚖️ Multi-Model Ensemble</span>
          </button>
        </div>
      </div>
    </div>
  );
};
