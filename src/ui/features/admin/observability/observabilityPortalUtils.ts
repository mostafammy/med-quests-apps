import { useEffect, useState, useRef } from 'react';
import type { CircadianStudyPhase } from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

export type ChartSeriesFilter = 'combined' | 'worker-requests' | 'd1-rows' | 'scholars';

export interface SvgCoord {
  readonly x: number;
  readonly y: number;
}

export function getCountryFlag(code?: string | null): string {
  if (!code || code === 'UN' || code === 'DEV') return '🌐';
  const clean = code.trim().toUpperCase();
  if (clean.length !== 2) return '🌐';
  const codePoints = [...clean].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function useAnimatedNumber(targetValue: number, durationMs = 520, decimals = 0): string {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const prevValueRef = useRef<number>(targetValue);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const delta = targetValue - startValue;
    if (Math.abs(delta) < 0.001) {
      setDisplayValue(targetValue);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startValue + delta * eased;
      setDisplayValue(current);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = targetValue;
        setDisplayValue(targetValue);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [targetValue, durationMs]);

  if (decimals > 0) {
    return displayValue.toFixed(decimals);
  }
  return Math.round(displayValue).toLocaleString();
}

export function buildSmoothCubicPath(points: readonly SvgCoord[], tension = 0.28): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;

  let path = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = Math.max(16, Math.min(220, p1.y + (p2.y - p0.y) * tension));
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = Math.max(16, Math.min(220, p2.y - (p3.y - p1.y) * tension));

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

export const STUDY_PHASE_META: Readonly<
  Record<
    CircadianStudyPhase,
    {
      readonly label: string;
      readonly shortLabel: string;
      readonly colorClass: string;
      readonly badgeBg: string;
      readonly hex: string;
    }
  >
> = {
  'peak-afternoon-rush': {
    label: 'Peak Afternoon Clinical Rush (3PM–8PM)',
    shortLabel: 'Peak Clinical Rush',
    colorClass: 'text-amber-500',
    badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    hex: '#f59e0b',
  },
  'evening-consolidation': {
    label: 'Evening Revision & Consolidation (9PM–12AM)',
    shortLabel: 'Evening Consolidation',
    colorClass: 'text-violet-500',
    badgeBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30',
    hex: '#8b5cf6',
  },
  'late-night-owl': {
    label: 'Late-Night Owl Deep Study (1AM–3AM)',
    shortLabel: 'Late-Night Owl',
    colorClass: 'text-indigo-500',
    badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
    hex: '#6366f1',
  },
  'dawn-pre-rounds': {
    label: 'Dawn Pre-Rounds Flash Review (4AM–7AM)',
    shortLabel: 'Dawn Pre-Rounds',
    colorClass: 'text-cyan-500',
    badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30',
    hex: '#06b6d4',
  },
  'morning-lectures': {
    label: 'University Hospital Lectures (8AM–2PM)',
    shortLabel: 'Hospital Lectures',
    colorClass: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    hex: '#10b981',
  },
};
