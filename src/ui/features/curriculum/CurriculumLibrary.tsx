import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, FileText, Sparkles } from 'lucide-react';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { useBlockContextStore, useActiveTaxonomy } from '../../../application/stores/useBlockContextStore.ts';
import { compositionRoot } from '../../../application/composition/clientCompositionRoot.ts';
import type { SourceDocument } from '../../../domain/curriculum/schemas.ts';

export const CurriculumLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale } = useLocaleStore();
  const { activeBlockId } = useBlockContextStore();
  const taxonomy = useActiveTaxonomy();

  const pack = compositionRoot.catalog.get(activeBlockId);
  const sources: readonly SourceDocument[] = pack?.manifest.sources ?? [];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-apple-entrance">
      {/* Top Header Card */}
      <div className="p-5 sm:p-7 md:p-8 rounded-3xl bg-white/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-700 dark:text-blue-300 text-xs font-semibold backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{taxonomy.block.code} • {t.curriculum.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-zinc-100 dark:via-zinc-200 dark:to-blue-200 bg-clip-text text-transparent">
            {taxonomy.block.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            {taxonomy.block.description || t.curriculum.subtitle}
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-xs self-start md:self-auto">
          {sources.length} {t.curriculum.badge}
        </div>
      </div>

      {/* Documents Grid / Empty State */}
      {sources.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 space-y-3">
          <FileText className="w-12 h-12 text-slate-400 dark:text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
            No Curriculum Sources Published Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
            Curriculum materials and lecture notes for {taxonomy.block.name} are currently being curated by faculty.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {sources.map((doc) => {
            const subject = taxonomy.subjects.find((s) => s.id === doc.subjectId);
            const localizedTitle =
              doc.title[locale] || doc.title.en || 'Curriculum Handout';
            const extentLabel = `${doc.extent.count} ${doc.extent.unit}`;

            return (
              <div
                key={doc.id}
                className="p-5 sm:p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] transition-all duration-300 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300 border border-blue-400/20 backdrop-blur-md">
                    {subject ? subject.name.replace(/^(CVS|CNS)\s+/, '') : doc.subjectId}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400 dark:text-zinc-500">
                    {doc.format} • {extentLabel}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-base leading-snug">
                    {localizedTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-mono truncate">
                    {doc.fileName}
                  </p>
                </div>

                {/* Highlight Badges */}
                {doc.highlights && doc.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {doc.highlights.map((h, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-slate-100/70 dark:bg-zinc-800/70 border border-slate-200/60 dark:border-zinc-700/60 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 backdrop-blur-md"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Evidence-Linked</span>
                  </span>
                  <button
                    onClick={() => navigate(`/test?subject=${doc.subjectId}`)}
                    className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer apple-tap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t.curriculum.launchPractice}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
