import React, { useState } from 'react';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { Copy, Check, Upload, Download, Sparkles, AlertCircle, Database } from 'lucide-react';

export const QuestionStudio: React.FC = () => {
  const { questions, ingestQuestions, exportBankJson, clearBank } = useQuestionStore();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('anatomy');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('cvs-ana-heart-dev');
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [ingestStatus, setIngestStatus] = useState<{ count: number; errors: string[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeSubject = CVS_TAXONOMY.subjects.find((s) => s.id === selectedSubjectId);
  const availableChapters = CVS_TAXONOMY.chapters.filter((c) => c.subjectId === selectedSubjectId);
  const activeChapter = CVS_TAXONOMY.chapters.find((c) => c.id === selectedChapterId);
  const chapterTopics = CVS_TAXONOMY.topics.filter((t) => t.chapterId === selectedChapterId);

  // Generate Master System Prompt for Google AI Studio / Claude
  const generatePrompt = () => {
    return `You are a Senior Medical Professor and USMLE Board Item Writer creating high-yield, strictly grounded Multiple Choice Questions for 2nd-year medical students.

I have uploaded the authoritative faculty curriculum document for:
- BLOCK: Cardiovascular System (Block 206)
- SUBJECT: ${activeSubject?.name}
- CHAPTER: ${activeChapter?.name} (ID: "${activeChapter?.id}")

AVAILABLE TOPIC IDS FOR THIS CHAPTER:
${chapterTopics.map((t) => `- "${t.id}": ${t.name}`).join('\n')}

INSTRUCTIONS:
1. Grounding Rule: Every single question must be 100% grounded in the uploaded materials. You MUST cite the verbatim evidence quote from the text or slides that proves the correct answer.
2. Choices Rule: Provide EXACTLY 4 choices ("a", "b", "c", "d"). Exactly ONE choice must be "isCorrect: true".
3. Distractors: Distractors must be plausible medical distractors from the curriculum and have clear rationales explaining why they are incorrect.
4. Output Format: Output ONLY a valid JSON array of question objects (NO markdown code fences, NO intro text, pure JSON).

JSON SCHEMA TO PRODUCE:
[
  {
    "id": "q-cvs-${selectedSubjectId.slice(0, 3)}-001",
    "blockId": "cvs",
    "subjectId": "${selectedSubjectId}",
    "chapterId": "${selectedChapterId}",
    "topicId": "${chapterTopics[0]?.id || 'topic-id'}",
    "concept": "Specific concept name",
    "type": "single-best-answer",
    "stem": "Clinical vignette or direct assessment question stem...",
    "choices": [
      { "id": "a", "text": "Option A text", "isCorrect": false, "rationale": "Why A is incorrect" },
      { "id": "b", "text": "Option B text", "isCorrect": true,  "rationale": "Why B is correct based on the text" },
      { "id": "c", "text": "Option C text", "isCorrect": false, "rationale": "Why C is incorrect" },
      { "id": "d", "text": "Option D text", "isCorrect": false, "rationale": "Why D is incorrect" }
    ],
    "explanation": "Comprehensive clinical and anatomical explanation of the correct mechanism.",
    "examTip": "High-yield board trap or key takeaway (optional)",
    "difficulty": 2,
    "cognitiveLevel": "understanding",
    "highYield": true,
    "origin": "authored-grounded",
    "evidence": [
      {
        "chunkId": "SRC-CVS-${selectedSubjectId.toUpperCase()}-01",
        "sourceName": "${activeChapter?.name}",
        "location": "Page X or Slide Y",
        "quote": "Exact verbatim sentence from the source document that proves the answer.",
        "kind": "text"
      }
    ],
    "status": "active",
    "bankVersion": 1
  }
]

Please generate 10-20 high-yield, challenging, board-style MCQs covering all the topics in this chapter.`;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleIngest = async () => {
    if (!jsonInput.trim()) return;
    setIsProcessing(true);
    const result = await ingestQuestions(jsonInput);
    setIngestStatus(result);
    setIsProcessing(false);
    if (result.count > 0 && result.errors.length === 0) {
      setJsonInput('');
    }
  };

  const handleDownloadBank = () => {
    const jsonStr = exportBankJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank.v1.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Question Ingestion Studio</h1>
            <p className="text-sm text-slate-500">
              Generate fine-tuned prompts for Google AI Studio / Claude, then paste validated JSON directly into your bank.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Prompt Generator */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
              <h2 className="font-semibold text-slate-900">Configure & Copy Prompt</h2>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">Free AI Portals</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const firstChap = CVS_TAXONOMY.chapters.find((c) => c.subjectId === e.target.value);
                  if (firstChap) setSelectedChapterId(firstChap.id);
                }}
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {CVS_TAXONOMY.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Chapter</label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <p className="font-semibold text-slate-700">How to use with Google AI Studio (Free):</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Open <strong>aistudio.google.com</strong> (Gemini 1.5 Pro / 2.0 Flash).</li>
              <li>Upload the PDF or PPTX for <strong>{activeChapter?.name}</strong>.</li>
              <li>Click the button below and paste the prompt.</li>
              <li>Copy the generated JSON output into Step 2.</li>
            </ol>
          </div>

          <button
            onClick={handleCopyPrompt}
            className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Prompt Copied to Clipboard!' : 'Copy Master Generation Prompt'}</span>
          </button>
        </div>

        {/* Step 2: JSON Ingestion */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
              <h2 className="font-semibold text-slate-900">Validate & Ingest Questions</h2>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium">Zod Guard</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Paste AI-Generated JSON
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste [...] array of questions here..."
              rows={8}
              className="w-full text-xs font-mono rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {ingestStatus && (
            <div
              className={`rounded-xl p-4 text-xs space-y-1.5 ${
                ingestStatus.errors.length === 0
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2 font-semibold">
                {ingestStatus.errors.length === 0 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>
                  {ingestStatus.count} question{ingestStatus.count === 1 ? '' : 's'} successfully validated & merged!
                </span>
              </div>
              {ingestStatus.errors.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-amber-700 max-h-32 overflow-y-auto">
                  {ingestStatus.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleIngest}
              disabled={isProcessing || !jsonInput.trim()}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isProcessing ? 'Validating...' : 'Validate & Ingest into Bank'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Bank Statistics & Export */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Current Question Bank Inventory</h3>
              <p className="text-xs text-slate-500">
                Total Loaded Questions: <strong className="text-slate-800">{questions.length}</strong>
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleDownloadBank}
              disabled={questions.length === 0}
              className="py-2 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Shipped Bank (bank.v1.json)</span>
            </button>
            {questions.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all loaded questions in this browser?')) clearBank();
                }}
                className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Chapters Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {CVS_TAXONOMY.chapters.map((chap) => {
            const count = questions.filter((q) => q.chapterId === chap.id).length;
            return (
              <div key={chap.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="truncate mr-2">
                  <div className="text-xs font-medium text-slate-800 truncate">{chap.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{chap.subjectId}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
