import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Play } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="border-b border-slate-200 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Curriculum Library</h1>
          <p className="text-sm text-slate-500">
            Authoritative faculty materials for the CVS Block. Grounding source for all questions and review links.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
          Block 206 (CVS)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-600 uppercase tracking-wider">{doc.subject}</span>
                <span className="font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{doc.size}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-base leading-snug">{doc.title}</h3>
              <p className="text-xs font-mono text-slate-400 truncate">{doc.fileName}</p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {doc.chapters.map((ch, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                    {ch}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Format: {doc.format}</span>
              </span>

              <button
                onClick={() => navigate('/test/quick')}
                className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold flex items-center space-x-1 transition-all cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Test this Material</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
