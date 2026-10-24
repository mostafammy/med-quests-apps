import React, { useState } from 'react';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { Copy, Check, Upload, Download, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    setTimeout(() => setCopied(false), 2000);
  };

  const handleIngest = async () => {
    if (!jsonInput.trim()) return;
    setIsProcessing(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const res = await ingestQuestions(Array.isArray(parsed) ? parsed : [parsed]);
      setIngestStatus(res);
      if (res.errors.length === 0) {
        setJsonInput('');
      }
    } catch {
      setIngestStatus({ count: 0, errors: ['Invalid JSON syntax. Ensure valid JSON array.'] });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const jsonStr = exportBankJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cvs-bank-v1-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] py-6 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 animate-apple-entrance">
      {/* Header */}
      <div className="p-5 sm:p-7 md:p-8 rounded-3xl bg-white/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Curriculum Grounding & Ingestion Studio</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-zinc-100 dark:via-zinc-200 dark:to-indigo-200 bg-clip-text text-transparent">
            Question Authoring Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            Generate grounded prompt templates for LLMs, validate against curriculum taxonomy schemas, and ingest into the local IndexedDB bank.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={handleExport}
            className="py-2.5 px-4 rounded-2xl bg-white/60 dark:bg-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-800 border border-white/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center space-x-2 shadow-xs transition-all duration-200 cursor-pointer apple-tap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Bank ({questions.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Step 1: Prompt Generator Glass Card */}
        <div className="p-5 sm:p-7 md:p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] space-y-5">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
            <span>Step 1: Grounded Prompt Architect</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
                Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const firstChap = CVS_TAXONOMY.chapters.find((c) => c.subjectId === e.target.value);
                  if (firstChap) setSelectedChapterId(firstChap.id);
                }}
                className="w-full text-xs font-semibold rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md py-2.5 px-3 text-slate-800 dark:text-zinc-200"
              >
                {CVS_TAXONOMY.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
                Chapter
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full text-xs font-semibold rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md py-2.5 px-3 text-slate-800 dark:text-zinc-200"
              >
                {availableChapters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generated Prompt Preview Box */}
          <div className="relative">
            <textarea
              readOnly
              rows={12}
              value={generatePrompt()}
              className="w-full text-xs font-mono rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-slate-900/90 text-slate-300 p-4 focus:outline-hidden backdrop-blur-md"
            />
            <button
              onClick={handleCopyPrompt}
              className="absolute top-3 right-3 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
            </button>
          </div>
        </div>

        {/* Step 2: JSON Ingestion Glass Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] space-y-5">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
            <span>Step 2: Ingest & Validate Items</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Paste the raw JSON output from your model below. The ingestion validator guarantees 100% schema compliance before committing to IndexedDB.
          </p>

          <textarea
            rows={10}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[ { "id": "q-cvs-ana-001", "stem": "...", "choices": [...] } ]'
            className="w-full text-base sm:text-xs font-mono rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md p-3.5 sm:p-4 text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={handleIngest}
              disabled={isProcessing || !jsonInput.trim()}
              className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20 transition-all cursor-pointer apple-tap"
            >
              <Upload className="w-4 h-4" />
              <span>{isProcessing ? 'Validating...' : 'Ingest & Store in IndexedDB'}</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Clear the local question bank in IndexedDB?')) {
                  clearBank();
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Clear Bank
            </button>
          </div>

          {ingestStatus && (
            <div className={`p-4 rounded-2xl text-xs ${
              ingestStatus.errors.length === 0
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-400/20'
                : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-400/20'
            }`}>
              {ingestStatus.errors.length === 0 ? (
                <div className="flex items-center space-x-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Successfully ingested and indexed {ingestStatus.count} questions!</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Failed with {ingestStatus.errors.length} validation errors:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {ingestStatus.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
