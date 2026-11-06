/**
 * Desktop Block Switcher Popover
 * WAI-ARIA listbox pattern, 44x44 pt touch targets, personal coverage ring.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import React, { useState, useRef, useEffect } from 'react';
import { Heart, Brain, Activity, Dna, Microscope, Check, ChevronDown, Sparkles } from 'lucide-react';
import { useActiveBlock } from '../../../application/stores/useBlockContextStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import type { BlockId } from '../../../domain/curriculum/ids.ts';

export function getBlockGlyphIcon(glyph: string, className = 'w-4 h-4') {
  switch (glyph) {
    case 'brain':
      return <Brain className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'lungs':
      return <Activity className={className} />;
    case 'dna':
      return <Dna className={className} />;
    case 'microscope':
      return <Microscope className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

interface CoverageRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  accent?: string;
}

export const CoverageRing: React.FC<CoverageRingProps> = ({
  percent,
  size = 22,
  strokeWidth = 2.5,
  accent,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label={`${percent}% coverage`}
      title={`${percent}% answered`}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-200 dark:text-zinc-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accent || 'var(--block-accent, #e11d48)'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {percent > 0 && percent < 100 && (
        <span className="absolute text-[8px] font-bold text-slate-700 dark:text-zinc-300 select-none">
          {percent}
        </span>
      )}
    </div>
  );
};

export const BlockSwitcher: React.FC = () => {
  const { activeBlockId, block, switchBlock, visibleBlocks, status } = useActiveBlock();
  const locale = useLocaleStore((s) => s.locale);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [coverages, setCoverages] = useState<Record<string, number>>({});
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load question counts and coverage percentages per visible block asynchronously from Dexie
  useEffect(() => {
    let isCancelled = false;

    async function loadStats() {
      const covResults: Record<string, number> = {};
      const countResults: Record<string, number> = {};

      for (const item of visibleBlocks) {
        const id = item.blockId;
        try {
          const qCount = await db.questions.where('blockId').equals(id).count();
          countResults[id] = qCount;

          if (qCount === 0) {
            covResults[id] = 0;
            continue;
          }

          const attempts = await db.attempts.where('blockId').equals(id).toArray();
          const uniqueQuestionIds = new Set(attempts.map((a) => a.questionId));
          covResults[id] = Math.round((uniqueQuestionIds.size / qCount) * 100);
        } catch {
          countResults[id] = 0;
          covResults[id] = 0;
        }
      }

      if (!isCancelled) {
        setQuestionCounts(countResults);
        setCoverages(covResults);
      }
    }

    loadStats();
    return () => {
      isCancelled = true;
    };
  }, [visibleBlocks, activeBlockId]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // INV-5: If only 1 block is visible, render nothing to maintain visual parity
  if (visibleBlocks.length < 2) {
    return null;
  }

  const activeIndex = visibleBlocks.findIndex((b) => b.blockId === activeBlockId);

  const handleOpen = () => {
    setIsOpen(true);
    setFocusedIndex(activeIndex >= 0 ? activeIndex : 0);
  };

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelect = async (blockId: BlockId) => {
    if (blockId === activeBlockId) {
      setIsOpen(false);
      return;
    }

    const targetPack = visibleBlocks.find((b) => b.blockId === blockId);
    const targetName = targetPack
      ? locale === 'ar'
        ? targetPack.manifest.block.name.ar
        : targetPack.manifest.block.name.en
      : blockId;
    const targetCode = targetPack?.manifest.block.code || '';

    setIsOpen(false);
    const outcome = await switchBlock(blockId, 'user-switcher');
    if (outcome.kind === 'committed') {
      const msg = `Switched to ${targetName}, ${targetCode}`;
      setAnnouncement(msg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % visibleBlocks.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + visibleBlocks.length) % visibleBlocks.length);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(visibleBlocks.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < visibleBlocks.length) {
          handleSelect(visibleBlocks[focusedIndex].blockId);
        }
        break;
    }
  };

  // Keep option focus in sync with focusedIndex
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  const activeName = block
    ? locale === 'ar'
      ? block.name.ar
      : block.name.en
    : activeBlockId.toUpperCase();

  const isSwitching = status === 'switching' || status === 'hydrating';

  return (
    <div ref={containerRef} className="relative inline-block text-left" onKeyDown={handleKeyDown}>
      {/* Screen Reader Live Region for VoiceOver Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Trigger Capsule Button (min 44x44 pt touch target) */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="curriculum-block-listbox"
        aria-label={`Curriculum Block: ${activeName}, ${block?.code || ''}. Select to switch block.`}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        disabled={isSwitching}
        className={`group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs sm:text-sm font-semibold transition-all duration-200 select-none min-h-[44px] min-w-[44px] ${
          isOpen
            ? 'bg-slate-200/80 dark:bg-zinc-800/80 border-slate-400 dark:border-zinc-600 shadow-xs'
            : 'bg-white/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-800/80 shadow-xs'
        } backdrop-blur-md active:scale-95`}
      >
        <span
          className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-transform duration-200"
          style={{ color: 'var(--block-accent, #e11d48)' }}
        >
          {block ? getBlockGlyphIcon(block.presentation.glyph, 'w-3.5 h-3.5') : <Sparkles className="w-3.5 h-3.5" />}
        </span>

        <span className="font-bold tracking-tight text-slate-800 dark:text-zinc-200 max-w-[110px] sm:max-w-[140px] truncate">
          {block?.code ? `${block.code.replace('Block ', 'B')}` : activeName}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover Listbox Menu */}
      {isOpen && (
        <div
          id="curriculum-block-listbox"
          role="listbox"
          aria-label="Curriculum Blocks"
          tabIndex={-1}
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right rtl:origin-top-left focus:outline-hidden"
        >
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800/60 mb-1 flex items-center justify-between">
            <span>{locale === 'ar' ? 'البلوكات الدراسية' : 'Curriculum Blocks'}</span>
            <span className="text-[10px] font-normal normal-case opacity-75">
              {visibleBlocks.length} {locale === 'ar' ? 'متاح' : 'available'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {visibleBlocks.map((desc, idx) => {
              const b = desc.manifest.block;
              const isSelected = b.id === activeBlockId;
              const isFocused = idx === focusedIndex;
              const name = locale === 'ar' ? b.name.ar : b.name.en;
              const coverage = coverages[b.id] ?? 0;

              return (
                <button
                  key={b.id}
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isFocused ? 0 : -1}
                  onClick={() => handleSelect(b.id)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left rtl:text-right transition-all duration-150 min-h-[44px] cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100/90 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40 text-slate-700 dark:text-zinc-300'
                  } ${isFocused ? 'ring-2 ring-blue-500/50 dark:ring-blue-400/50' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Glyph Container */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: isSelected ? 'var(--block-accent-soft, rgba(225,29,72,0.12))' : undefined,
                        borderColor: isSelected ? 'var(--block-accent, #e11d48)' : 'transparent',
                        color: isSelected ? 'var(--block-accent, #e11d48)' : 'currentColor',
                      }}
                    >
                      {getBlockGlyphIcon(b.presentation.glyph, 'w-4 h-4')}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{name}</span>
                        {b.status === 'beta' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Beta
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                        <span>{b.code}</span>
                        <span>•</span>
                        <span>
                          {questionCounts[b.id] ?? 0} {locale === 'ar' ? 'سؤال' : 'questions'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <CoverageRing percent={coverage} />
                    {isSelected && (
                      <Check
                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
