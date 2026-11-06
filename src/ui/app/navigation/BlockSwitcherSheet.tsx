/**
 * Mobile Bottom Sheet Block Switcher
 * Apple HIG medium-detent bottom sheet with swipe-to-dismiss gesture.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { useActiveBlock } from '../../../application/stores/useBlockContextStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import { getBlockGlyphIcon, CoverageRing } from './BlockSwitcher.tsx';
import type { BlockId } from '../../../domain/curriculum/ids.ts';

interface BlockSwitcherSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BlockSwitcherSheet: React.FC<BlockSwitcherSheetProps> = ({ isOpen, onClose }) => {
  const { activeBlockId, switchBlock, visibleBlocks } = useActiveBlock();
  const locale = useLocaleStore((s) => s.locale);
  const [coverages, setCoverages] = useState<Record<string, number>>({});
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

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

    if (isOpen) {
      loadStats();
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, visibleBlocks, activeBlockId]);

  // Touch drag for swipe-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    currentYRef.current = e.touches[0].clientY;
    const deltaY = Math.max(0, currentYRef.current - startYRef.current);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const deltaY = currentYRef.current - startYRef.current;
    if (deltaY > 100) {
      onClose();
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
  };

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || visibleBlocks.length < 2) {
    return null;
  }

  const handleSelect = async (blockId: BlockId) => {
    onClose();
    if (blockId !== activeBlockId) {
      await switchBlock(blockId, 'user-switcher');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select Curriculum Block"
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content with Apple medium detent feel */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-lg rounded-t-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-zinc-800/80 shadow-2xl p-5 z-10 pb-[env(safe-area-inset-bottom,1.5rem)] animate-in slide-in-from-bottom duration-250 ease-out transition-transform"
      >
        {/* Grabber Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto mb-4 cursor-grab active:cursor-grabbing" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-zinc-800/60">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              {locale === 'ar' ? 'البلوكات الدراسية' : 'Curriculum Blocks'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {locale === 'ar'
                ? 'اختر البلوك الأكاديمي لتغيير بنك الأسئلة والمنهج'
                : 'Select an academic block to switch questions and curriculum'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-2 py-1" role="listbox" aria-label="Curriculum Blocks">
          {visibleBlocks.map((desc) => {
            const b = desc.manifest.block;
            const isSelected = b.id === activeBlockId;
            const name = locale === 'ar' ? b.name.ar : b.name.en;
            const coverage = coverages[b.id] ?? 0;

            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(b.id)}
                className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl text-left rtl:text-right transition-all min-h-[52px] active:scale-[0.98] ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-zinc-800/90 text-slate-900 dark:text-zinc-100 font-semibold border border-slate-200 dark:border-zinc-700 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--block-accent-soft, rgba(225,29,72,0.12))'
                        : undefined,
                      borderColor: isSelected ? 'var(--block-accent, #e11d48)' : 'transparent',
                      color: isSelected ? 'var(--block-accent, #e11d48)' : 'currentColor',
                    }}
                  >
                    {getBlockGlyphIcon(b.presentation.glyph, 'w-5 h-5')}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-3 shrink-0">
                  <CoverageRing percent={coverage} size={26} strokeWidth={3} />
                  {isSelected && (
                    <Check
                      className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
