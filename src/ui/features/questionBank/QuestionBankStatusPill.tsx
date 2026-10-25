import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, RotateCcw, RefreshCw, ShieldCheck, Database, Layers } from 'lucide-react';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { ResetBankConfirmationModal } from './ResetBankConfirmationModal.tsx';

export const QuestionBankStatusPill: React.FC = () => {
  const { questions, isSyncing, syncCursor, syncWithGlobalBank } = useQuestionStore();
  const { t } = useLocaleStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click and Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSyncClick = async () => {
    try {
      await syncWithGlobalBank('cvs');
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Interactive Trigger Capsule */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Question Bank Status & Actions (Click to manage)"
        className={`flex items-center space-x-2 rtl:space-x-reverse bg-white/60 dark:bg-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-800/80 backdrop-blur-md border border-white/80 dark:border-zinc-700/70 px-3 py-1.5 rounded-2xl text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer shadow-xs transition-all duration-200 hover:-translate-y-0.5 apple-tap ${
          isOpen ? 'ring-2 ring-blue-500/40 bg-white/90 dark:bg-zinc-800/90' : ''
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="hidden sm:inline">
          {t.nav.activeBlockPrefix}: 206 • {questions.length} Qs
        </span>
        <span className="sm:hidden">
          206
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Apple-Caliber Frosted Glass Popover */}
      {isOpen && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 sm:w-88 rounded-3xl glass-surface border border-slate-200/80 dark:border-zinc-800 shadow-2xl p-4 sm:p-5 space-y-4 z-50 animate-spring-modal-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800/60 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Cardiovascular (Block 206)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Official Faculty Question Bank
              </p>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              Rev #{syncCursor?.serverRevision ?? 1}
            </span>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-2xl bg-slate-100/70 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-zinc-800/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Database className="w-3 h-3" />
                Local Bank
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                {questions.length} <span className="text-xs font-normal text-slate-400">items</span>
              </div>
            </div>
            <div className="border-l border-slate-200 dark:border-zinc-800 pl-2.5 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2.5">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Edge Status
              </span>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {t.bank.edgeVerified}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Sync Now */}
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-xs font-bold transition-all cursor-pointer apple-tap disabled:opacity-50"
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? t.bank.syncing : t.bank.syncNowBtn}</span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                Delta
              </span>
            </button>

            {/* Reset to Global Bank */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowResetModal(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 text-xs font-bold transition-all cursor-pointer apple-tap"
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span>{t.bank.resetToGlobalBtn}</span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                106 Canonical
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ResetBankConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};
