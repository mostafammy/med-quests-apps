import React from 'react';
import type { PvLoopSimulationResult } from '../../../../domain/ai/tools/toolTypes.ts';
import { Activity, Info } from 'lucide-react';

interface Props {
  result: PvLoopSimulationResult;
}

export const HemodynamicPvLoopCard: React.FC<Props> = ({ result }) => {
  if (!result || !result.normalParams || !result.pathologicParams) return null;
  const { pathologyLabel, chronicity, normalParams, pathologicParams, clinicalSummary } = result;

  // SVG Coordinate mapping:
  // Volume: X-axis (0 to 240 mL) -> SVG X: 40 to 280
  // Pressure: Y-axis (0 to 220 mmHg) -> SVG Y: 180 to 20 (inverted)
  const mapX = (v: number) => 40 + (v / 240) * 240;
  const mapY = (p: number) => 180 - (p / 220) * 160;

  // Build box paths for PV loops (simplified realistic loop)
  const buildLoopPath = (params: typeof normalParams) => {
    const xEsv = mapX(params.esvMl);
    const xEdv = mapX(params.edvMl);
    const yEdp = mapY(params.lvEdpMmHg);
    const yPeak = mapY(params.peakLvSystolicMmHg);
    const yDiastolicLow = mapY(4);

    // Isovolumetric contraction -> Systolic ejection -> Isovolumetric relaxation -> Diastolic filling
    return `M ${xEdv} ${yEdp} 
            L ${xEdv} ${mapY(params.peakLvSystolicMmHg * 0.65)} 
            Q ${xEdv} ${yPeak}, ${(xEsv + xEdv) / 2} ${yPeak} 
            Q ${xEsv} ${yPeak}, ${xEsv} ${mapY(params.peakLvSystolicMmHg * 0.7)} 
            L ${xEsv} ${yDiastolicLow} 
            Q ${(xEsv + xEdv) / 2} ${yDiastolicLow + 3}, ${xEdv} ${yEdp} Z`;
  };

  const normalPath = buildLoopPath(normalParams);
  const pathPath = buildLoopPath(pathologicParams);

  return (
    <div className="relative my-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl overflow-hidden shadow-md shadow-indigo-500/5">
      {/* Top Specular Gradient */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500" />

      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-zinc-800/60 border-b border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">
            {pathologyLabel} P-V Loop Simulation
          </h4>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
          {chronicity.replace('_', ' ')}
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="p-3 bg-slate-950/90 text-white rounded-b-none flex flex-col items-center">
        <svg viewBox="0 0 320 200" className="w-full max-w-sm h-44 select-none">
          {/* Grid lines */}
          <line x1="40" y1="20" x2="40" y2="180" stroke="#334155" strokeWidth="1" />
          <line x1="40" y1="180" x2="300" y2="180" stroke="#334155" strokeWidth="1" />

          {/* Normal Loop (dashed slate) */}
          <path
            d={normalPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />

          {/* Pathological Loop (solid cyan/indigo) */}
          <path
            d={pathPath}
            fill="rgba(99, 102, 241, 0.15)"
            stroke="#38bdf8"
            strokeWidth="2"
          />

          {/* Axis Labels */}
          <text x="170" y="196" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
            LV Volume (mL)
          </text>
          <text x="12" y="100" fill="#94a3b8" fontSize="9" textAnchor="middle" transform="rotate(-90 12,100)" fontFamily="sans-serif">
            LV Pressure (mmHg)
          </text>

          {/* Volume ticks */}
          <text x={mapX(50)} y="190" fill="#64748b" fontSize="8" textAnchor="middle">50</text>
          <text x={mapX(120)} y="190" fill="#64748b" fontSize="8" textAnchor="middle">120</text>
          <text x={mapX(200)} y="190" fill="#64748b" fontSize="8" textAnchor="middle">200</text>

          {/* Pressure ticks */}
          <text x="35" y={mapY(120)} fill="#64748b" fontSize="8" textAnchor="end">120</text>
          <text x="35" y={mapY(200)} fill="#64748b" fontSize="8" textAnchor="end">200</text>
        </svg>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-[10px] font-mono pt-1 text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" />
            <span>Normal Baseline</span>
          </span>
          <span className="flex items-center space-x-1 text-cyan-400 font-bold">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
            <span>{pathologyLabel}</span>
          </span>
        </div>
      </div>

      {/* Hemodynamic Metrics Table */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-zinc-800 text-center py-2 bg-slate-50/60 dark:bg-zinc-850/60 text-xs border-t border-slate-200/60 dark:border-zinc-800/60">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">EDV</div>
          <div className="font-mono font-bold text-slate-800 dark:text-zinc-200">
            {pathologicParams.edvMl} mL
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">ESV</div>
          <div className="font-mono font-bold text-slate-800 dark:text-zinc-200">
            {pathologicParams.esvMl} mL
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Stroke Vol</div>
          <div className="font-mono font-bold text-slate-800 dark:text-zinc-200">
            {pathologicParams.strokeVolumeMl} mL
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">EF %</div>
          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {pathologicParams.ejectionFractionPct}%
          </div>
        </div>
      </div>

      {/* Clinical Mechanism Note */}
      <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/30 border-t border-indigo-200/50 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-zinc-300 flex items-start space-x-2">
        <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">{clinicalSummary}</p>
      </div>
    </div>
  );
};
