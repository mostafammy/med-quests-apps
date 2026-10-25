import React from 'react';
import type {
  SrsAnchorResult,
  MnemonicAnchorResult,
  MicroCurriculumResult,
} from '../../../../domain/ai/tools/toolTypes.ts';
import { Bookmark, Sparkles, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCopilotStore } from '../../../../application/stores/useCopilotStore.ts';

interface SrsProps {
  result: SrsAnchorResult;
}

export const SrsFlashcardCard: React.FC<SrsProps> = ({ result }) => {
  if (!result) return null;
  return (
    <div className="relative my-3 p-4 rounded-2xl border border-emerald-300/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-transparent dark:from-emerald-950/30 dark:via-zinc-900/60 backdrop-blur-xl shadow-md shadow-emerald-500/5 space-y-2.5 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-black text-emerald-950 dark:text-emerald-300">
          <Bookmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="uppercase tracking-wider">SRS Flashcard Synthesized</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30">
          Saved to Deck (1d Interval)
        </span>
      </div>
      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-950/70 border border-slate-200/60 dark:border-zinc-800 text-xs space-y-1.5">
        <div className="font-bold text-slate-800 dark:text-zinc-200">Q: {result.frontPrompt}</div>
        <div className="font-semibold text-emerald-700 dark:text-emerald-400 border-t border-slate-100 dark:border-zinc-800 pt-1.5">
          A: {result.backAnswer}
        </div>
      </div>
    </div>
  );
};

interface MnemonicProps {
  result: MnemonicAnchorResult;
}

export const MnemonicAnchorCard: React.FC<MnemonicProps> = ({ result }) => {
  if (!result) return null;
  const mappings = Array.isArray(result.expansionMappings) ? result.expansionMappings : [];
  const token = result.mnemonicToken || 'MNEMONIC';
  const rule = result.clinicalApplicationRule || '';

  return (
    <div className="relative my-3 p-4 rounded-2xl border border-purple-300/80 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/70 via-pink-50/40 to-transparent dark:from-purple-950/30 dark:via-zinc-900/60 backdrop-blur-xl shadow-md shadow-purple-500/5 space-y-2.5 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-black text-purple-950 dark:text-purple-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span className="uppercase tracking-wider">Clinical Mnemonic Anchor</span>
        </div>
        <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-md bg-purple-600 text-white shadow-xs">
          {token}
        </span>
      </div>

      {mappings.length > 0 && (
        <div className="space-y-1 text-xs">
          {mappings.map((m: { letter: string; meaning: string }, idx: number) => (
            <div key={idx} className="flex items-center space-x-2">
              <span className="w-5 font-mono font-black text-purple-600 dark:text-purple-400 text-center">
                {m?.letter || ''}
              </span>
              <span className="text-slate-700 dark:text-zinc-300 font-medium">{m?.meaning || ''}</span>
            </div>
          ))}
        </div>
      )}

      {rule && (
        <div className="p-2.5 rounded-xl bg-purple-100/50 dark:bg-purple-950/40 text-xs text-purple-950 dark:text-purple-200 border border-purple-200/60 dark:border-purple-900/40 leading-relaxed font-medium">
          <strong>Exam Rule:</strong> {rule}
        </div>
      )}
    </div>
  );
};

interface MicroCurriculumProps {
  result: MicroCurriculumResult;
}

export const MicroCurriculumCard: React.FC<MicroCurriculumProps> = ({ result }) => {
  const navigate = useNavigate();
  const { closeDrawer } = useCopilotStore();

  if (!result) return null;
  const questionCount = Array.isArray(result.selectedQuestionIds) ? result.selectedQuestionIds.length : 3;

  const handleLaunchDrill = () => {
    closeDrawer();
    navigate('/session/retest-session', {
      state: {
        mode: 'retest',
        questionCount,
        title: result.targetWeaknessTitle || 'Clinical Remediation Drill',
      },
    });
  };

  return (
    <div className="relative my-3 p-4 rounded-2xl border border-indigo-300/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-transparent dark:from-indigo-950/30 dark:via-zinc-900/60 backdrop-blur-xl shadow-md shadow-indigo-500/5 space-y-3 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-black text-indigo-950 dark:text-indigo-300">
          <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="uppercase tracking-wider">3-Step Remediation Plan</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 font-bold border border-indigo-500/30">
          Scheduled 48h Retest
        </span>
      </div>

      <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-950/70 border border-slate-200/60 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-medium space-y-1">
        <div className="font-bold text-slate-900 dark:text-zinc-100 uppercase text-[10px] tracking-wide text-indigo-600 dark:text-indigo-400">
          Step 1: Core Pathophysiological Mechanism
        </div>
        <p>{result.twoMinuteMechanismReview || ''}</p>
      </div>

      <button
        onClick={handleLaunchDrill}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
      >
        <span>Step 2: Launch Targeted {questionCount}-Question Drill</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
