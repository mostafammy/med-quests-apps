import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const MockExamBlueprintCard: React.FC = () => {
  return (
    <div className="glass-surface rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200/70 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Official Exam Simulation Parameters
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Faculty Block Standardized Blueprint</p>
        </div>
        <span className="px-3 py-1 bg-indigo-500/10 dark:bg-indigo-400/15 border border-indigo-400/30 dark:border-indigo-400/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
          Timed Simulation
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-surface p-3.5 rounded-xl text-center border border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider">Volume</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">50 Questions</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Stratified across block subjects</div>
        </div>

        <div className="glass-surface p-3.5 rounded-xl text-center border border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider">Duration</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">120 Minutes</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">144s per Question pacing</div>
        </div>

        <div className="glass-surface p-3.5 rounded-xl text-center border border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider">Feedback Mode</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">Exam Conditions</div>
          <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Explanations deferred to report</div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/90 dark:bg-black/80 text-slate-200 border border-slate-800 text-xs space-y-1.5">
        <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-amber-400 font-bold uppercase tracking-wider text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Standardized Exam Rules</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-300 dark:text-zinc-400 text-[11px]">
          <li>Keyboard answering (<code className="font-mono text-amber-300">1</code>–<code className="font-mono text-amber-300">4</code>) records choices silently without feedback.</li>
          <li>Free question navigation matrix and flagging (Press <code className="font-mono text-amber-300">F</code>) available throughout.</li>
          <li>Comprehensive score report & curriculum revision plan appear upon submission.</li>
        </ul>
      </div>
    </div>
  );
};
