import React from 'react';
import type { CardiovascularEquationResult } from '../../../../domain/ai/tools/toolTypes.ts';
import { Calculator, CheckCircle2 } from 'lucide-react';

interface Props {
  result: CardiovascularEquationResult;
}

export const CardiovascularEquationCard: React.FC<Props> = ({ result }) => {
  if (!result) return null;
  return (
    <div className="relative my-3 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-zinc-900/60 backdrop-blur-xl shadow-md shadow-blue-500/5 space-y-3 overflow-hidden">
      {/* Top Accent Line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-black text-blue-950 dark:text-blue-300">
          <div className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span className="uppercase tracking-wider">{result.title}</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
          Normal: {result.referenceRange}
        </span>
      </div>

      {/* Formula & Steps */}
      <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-950/70 border border-slate-200/60 dark:border-zinc-800 text-xs font-mono space-y-1">
        <div className="text-slate-500 dark:text-zinc-400 font-semibold">{result.formulaExpression}</div>
        <div className="text-blue-600 dark:text-blue-400 font-bold">{result.substitutionSteps}</div>
      </div>

      {/* Computed Value Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wide">Computed Value</span>
        <div className="text-base font-black font-mono">
          {result.computedValue} <span className="text-xs font-normal opacity-90">{result.unit}</span>
        </div>
      </div>

      {/* Clinical Interpretation */}
      <div className="text-xs text-slate-700 dark:text-zinc-300 flex items-start space-x-1.5 leading-relaxed font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>{result.hemodynamicInterpretation}</span>
      </div>
    </div>
  );
};
