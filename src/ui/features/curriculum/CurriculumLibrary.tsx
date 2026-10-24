import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen } from 'lucide-react';

export const CurriculumLibrary: React.FC = () => {
  const navigate = useNavigate();

  const documents = [
    {
      id: 'doc-ana-01',
      subject: 'Anatomy',
      title: '2nd Year CVS Anatomy of Heart and Mediastinum Handout',
      fileName: '2nd year cvs anatomy of heart and mediastnum hanout.pdf',
      format: 'PDF',
      size: '49 Pages',
      chapters: ['Heart & Mediastinum', 'Pericardium', 'Chambers', 'Coronary Vessels'],
    },
    {
      id: 'doc-ana-02',
      subject: 'Anatomy',
      title: 'Development of the Heart & Congenital Anomalies',
      fileName: 'Development of the heart.pdf',
      format: 'PDF',
      size: '16 Pages',
      chapters: ['Cardiac Looping', 'Atrial Septation', 'ASDs & VSDs', 'TGA'],
    },
    {
      id: 'doc-ana-03',
      subject: 'Anatomy',
      title: 'Fetal Circulation and Blood Vessel Development',
      fileName: 'Fetal cirulation and BV development.pdf',
      format: 'PDF',
      size: '16 Pages',
      chapters: ['Aortic Arches', 'Cardinal Veins', 'Fetal Shunts'],
    },
    {
      id: 'doc-his-01',
      subject: 'Histology',
      title: 'Histology of Cardiovascular System (Lecture 3)',
      fileName: '3- HISTOLOGY OF CVS ppt (1).pptx',
      format: 'PPTX',
      size: '16 Slides',
      chapters: ['Heart Wall Layers', 'Purkinje Fibres', 'Intercalated Discs'],
    },
    {
      id: 'doc-his-02',
      subject: 'Histology',
      title: 'Histology of the Blood Vessels (Lectures 24 & 25)',
      fileName: 'Histology of  the blood vessels 24&25.pptx',
      format: 'PPTX',
      size: '30 Slides',
      chapters: ['Tunica Layers', 'Capillaries', 'Carotid Sinus/Body'],
    },
    {
      id: 'doc-mic-01',
      subject: 'Microbiology',
      title: 'Handout CVS Microbiology: Rheumatic Fever, IE & Myocarditis',
      fileName: 'handout CVS microbiology.docx',
      format: 'DOCX',
      size: '3 Lectures',
      chapters: ['GAS & Molecular Mimicry', 'JONES Criteria', 'Duke Criteria'],
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-apple-entrance">
      {/* Top Header Card */}
      <div className="p-5 sm:p-7 md:p-8 rounded-3xl bg-white/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-700 dark:text-blue-300 text-xs font-semibold backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Cardiovascular Block 206 Curriculum</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-zinc-100 dark:via-zinc-200 dark:to-blue-200 bg-clip-text text-transparent">
            Faculty Curriculum Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            The authoritative lecture slides, syllabi, and handouts powering every question and explanation.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border border-white/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-xs self-start md:self-auto">
          6 Handouts Indexed
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-5 sm:p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] transition-all duration-300 space-y-4"
          >
            <div className="flex items-start justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300 border border-blue-400/20 backdrop-blur-md">
                {doc.subject}
              </span>
              <span className="text-xs font-mono font-semibold text-slate-400 dark:text-zinc-500">
                {doc.format} • {doc.size}
              </span>
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-base leading-snug">
                {doc.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-mono truncate">
                {doc.fileName}
              </p>
            </div>

            {/* Chapter Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {doc.chapters.map((ch, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-slate-100/70 dark:bg-zinc-800/70 border border-slate-200/60 dark:border-zinc-700/60 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 backdrop-blur-md"
                >
                  {ch}
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Grounding Document
              </span>
              <button
                onClick={() => navigate('/test/quick')}
                className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Practice Topic</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
