import React, { useState, useEffect } from 'react';
import { CVS_TAXONOMY } from '../../../domain/taxonomy/cvsTaxonomy.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import {
  Copy,
  Check,
  Upload,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Globe,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const QuestionStudio: React.FC = () => {
  const {
    questions,
    syncCursor,
    isSyncing,
    lastMergeReport,
    mySubmissions,
    ingestQuestions,
    submitQuestionsForGlobalReview,
    syncWithGlobalBank,
    loadMySubmissions,
    exportBankJson,
    clearBank,
  } = useQuestionStore();

  const { authState } = useAuthStore();
  const { t } = useLocaleStore();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('anatomy');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('cvs-ana-heart-dev');
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [ingestStatus, setIngestStatus] = useState<{
    count: number;
    errors: string[];
    ticketCount?: number;
    mode?: 'local' | 'global_review';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSubmissionsTracker, setShowSubmissionsTracker] = useState(false);

  const activeSubject = CVS_TAXONOMY.subjects.find((s) => s.id === selectedSubjectId);
  const availableChapters = CVS_TAXONOMY.chapters.filter((c) => c.subjectId === selectedSubjectId);
  const activeChapter = CVS_TAXONOMY.chapters.find((c) => c.id === selectedChapterId);
  const chapterTopics = CVS_TAXONOMY.topics.filter((t) => t.chapterId === selectedChapterId);

  useEffect(() => {
    const userId = authState.user?.id || 'usr_local_author';
    loadMySubmissions(userId);
  }, [authState.user?.id, loadMySubmissions]);

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

  // Action 1: Save Locally to Device (Private Sandbox, 0ms)
  const handleIngestLocalOnly = async () => {
    if (!jsonInput.trim()) return;
    setIsProcessing(true);
    try {
      const res = await ingestQuestions(jsonInput);
      setIngestStatus({ ...res, mode: 'local' });
      if (res.errors.length === 0) {
        setJsonInput('');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Action 2: Save Locally AND Submit for Global Curriculum Review
  const handleSubmitGlobalReview = async () => {
    if (!jsonInput.trim()) return;
    setIsProcessing(true);
    try {
      const user = authState.user;
      const res = await submitQuestionsForGlobalReview(jsonInput, {
        authorId: user?.id || 'usr_local_author',
        authorDisplayName: user?.displayName || 'Medical Scholar',
        authorRole: user?.role || 'student-pro',
      });
      setIngestStatus({
        count: res.count,
        errors: res.errors,
        ticketCount: res.ticketCount,
        mode: 'global_review',
      });
      if (res.errors.length === 0) {
        setJsonInput('');
        setShowSubmissionsTracker(true);
      }
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
      {/* 1. Global Bank Synchronizer Ribbon */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-400/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Global Question Bank (CVS)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
                Rev #{syncCursor?.serverRevision || 1}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {questions.length} total questions in local database. Read-only delta sync automatically pulls verified additions from peers.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => syncWithGlobalBank('cvs')}
            disabled={isSyncing}
            className="py-2 px-3.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer apple-tap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Global Bank'}</span>
          </button>
        </div>
      </div>

      {/* Delta Sync Report Toast */}
      {lastMergeReport && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-apple-entrance">
          <div className="flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Synchronized successfully: <strong>+{lastMergeReport.insertedCount} new canonical questions</strong>, {lastMergeReport.preservedLocalCustomCount} local custom questions preserved without modification.
            </span>
          </div>
        </div>
      )}

      {/* 2. Main Studio Header */}
      <div className="p-5 sm:p-7 md:p-8 rounded-3xl bg-white/65 dark:bg-zinc-900/65 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t.studio.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-zinc-100 dark:via-zinc-200 dark:to-indigo-200 bg-clip-text text-transparent">
            {t.studio.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
            {t.studio.subtitle}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={handleExport}
            className="py-2.5 px-4 rounded-2xl bg-white/60 dark:bg-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-800 border border-white/80 dark:border-zinc-700/80 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center space-x-2 shadow-xs transition-all duration-200 cursor-pointer apple-tap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.studio.exportBtn} ({questions.length})</span>
          </button>
        </div>
      </div>

      {/* 3. Author's Submitted Questions Tracker (Collapsible) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-xs space-y-4">
        <button
          onClick={() => setShowSubmissionsTracker(!showSubmissionsTracker)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              My Submissions to Global Curriculum ({mySubmissions.length})
            </span>
          </div>
          {showSubmissionsTracker ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {showSubmissionsTracker && (
          <div className="space-y-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
            {mySubmissions.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You have not submitted any questions for global review yet. Use "Add Locally & Submit for Global Review" below to propose questions.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {mySubmissions.map((sub) => {
                  let badge = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/30';
                  let statusLabel = 'Pending Review';
                  if (sub.editorialStatus === 'published') {
                    badge = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30';
                    statusLabel = 'Published Globally';
                  } else if (sub.editorialStatus === 'changes_requested') {
                    badge = 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-400/30';
                    statusLabel = 'Changes Requested';
                  } else if (sub.editorialStatus === 'rejected') {
                    badge = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-400/30';
                    statusLabel = 'Rejected';
                  }

                  return (
                    <div
                      key={sub.ticketId}
                      className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-zinc-500 font-semibold">{sub.question.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">{sub.question.stem}</p>
                      {sub.reviewerNotes && (
                        <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-[11px] text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800">
                          <strong>Faculty Feedback:</strong> {sub.reviewerNotes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Generation & Ingestion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Step 1: LLM Prompt Generator Glass Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
              <span>Step 1: Curriculum Targeting</span>
            </div>
            <button
              onClick={handleCopyPrompt}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer apple-tap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.studio.promptCopied : t.studio.copyPrompt}</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                {t.studio.selectSubject}
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const firstChap = CVS_TAXONOMY.chapters.find((c) => c.subjectId === e.target.value);
                  if (firstChap) setSelectedChapterId(firstChap.id);
                }}
                className="w-full text-xs font-semibold rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md p-3 text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {CVS_TAXONOMY.subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                {t.studio.selectChapter}
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full text-xs font-semibold rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md p-3 text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {availableChapters.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    {chap.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Target Topics in this Chapter ({chapterTopics.length})
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-100 dark:border-zinc-800">
                {chapterTopics.map((t) => (
                  <div key={t.id} className="text-xs flex items-center space-x-2 text-slate-600 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: JSON Ingestion Glass Card with Dual Actions */}
        <div className="p-6 md:p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/80 dark:border-zinc-800/80 shadow-[0_4px_24px_0_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] space-y-5">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
            <span>Step 2: Ingest & Dual-Route Commit</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Paste the raw JSON array from your model below. You can save it privately to your device to practice right away, or propose it for global curriculum inclusion.
          </p>

          <textarea
            rows={8}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[ { "id": "q-cvs-ana-001", "stem": "...", "choices": [...] } ]'
            className="w-full text-base sm:text-xs font-mono rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md p-3.5 sm:p-4 text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
          />

          {/* Dual Action Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Action A: Save to My Device Only */}
            <button
              onClick={handleIngestLocalOnly}
              disabled={isProcessing || !jsonInput.trim()}
              className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-40 transition-all cursor-pointer apple-tap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Processing...' : 'Save to My Device (Private)'}</span>
            </button>

            {/* Action B: Add Locally & Submit for Global Review */}
            <button
              onClick={handleSubmitGlobalReview}
              disabled={isProcessing || !jsonInput.trim()}
              className="py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20 disabled:opacity-40 transition-all cursor-pointer apple-tap"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-200" />
              <span>{isProcessing ? 'Submitting...' : 'Add Locally & Submit for Review'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              * "Submit for Review" saves to your local device immediately and sends a copy to the faculty triage queue.
            </span>
            <button
              onClick={() => {
                if (confirm('Clear the local question bank in IndexedDB?')) {
                  clearBank();
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              {t.studio.clearBtn}
            </button>
          </div>

          {ingestStatus && (
            <div
              className={`p-4 rounded-2xl text-xs ${
                ingestStatus.errors.length === 0
                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-400/20'
                  : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-400/20'
              }`}
            >
              {ingestStatus.errors.length === 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {ingestStatus.mode === 'global_review'
                        ? `Saved ${ingestStatus.count} questions locally and queued for Faculty Review!`
                        : `Successfully saved ${ingestStatus.count} questions to your local device!`}
                    </span>
                  </div>
                  {ingestStatus.ticketCount !== undefined && ingestStatus.ticketCount > 0 && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pl-6">
                      Assigned {ingestStatus.ticketCount} curriculum review ticket(s). Once verified by faculty, your questions will be published to all scholars.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Failed with {ingestStatus.errors.length} validation error(s):</span>
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
