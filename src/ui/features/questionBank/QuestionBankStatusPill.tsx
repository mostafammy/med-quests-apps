import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, RotateCcw, RefreshCw, ShieldCheck, Database, Layers, X } from 'lucide-react';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { useActiveBlock } from '../../../application/stores/useBlockContextStore.ts';
import defaultCvsBank from '../../../../content/cvs/dist/bank.v1.json';
import { ResetBankConfirmationModal } from './ResetBankConfirmationModal.tsx';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const QuestionBankStatusPill: React.FC = () => {
  const {
    questions,
    isSyncing,
    syncCursor,
    pendingDiffPreview,
    dismissedRemoteRevision,
    checkForGlobalUpdates,
  } = useQuestionStore();
  const { t, isRtl, locale } = useLocaleStore();
  const { activeBlockId, block } = useActiveBlock();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const [islandOffsetPx, setIslandOffsetPx] = useState<number>(0);

  const localRev = syncCursor?.serverRevision ?? 1;
  const remoteRev = pendingDiffPreview?.remoteRevision ?? localRev;
  const hasNewGlobalRevision = Boolean(pendingDiffPreview?.hasChanges || pendingDiffPreview?.isOutOfDate);
  const isDismissed =
    dismissedRemoteRevision !== null &&
    Number(dismissedRemoteRevision) === Number(remoteRev);
  const hasActionableUpdates = hasNewGlobalRevision && !isDismissed;

  // Dynamic viewport collision solver: guarantees the island is 100% inside the viewport on any screen width.
  // Applied to the outer non-animated wrapper so @keyframes transform-fill never overrides the shift.
  const clampIslandToViewport = useCallback(() => {
    if (typeof window === 'undefined' || !islandRef.current) return;
    // On mobile (< 640px), CSS fixed left-3 right-3 handles centering
    if (window.innerWidth < 640) {
      setIslandOffsetPx(0);
      return;
    }

    const rect = islandRef.current.getBoundingClientRect();
    const currentShift = islandOffsetPx;
    const naturalLeft = rect.left - currentShift;
    const naturalRight = rect.right - currentShift;
    const margin = 12;
    const vw = Math.min(
      window.innerWidth,
      document.documentElement?.clientWidth || window.innerWidth
    );

    let nextShift = 0;
    if (naturalRight > vw - margin) {
      nextShift = vw - margin - naturalRight;
    } else if (naturalLeft < margin) {
      nextShift = margin - naturalLeft;
    }

    if (Math.abs(nextShift - currentShift) > 0.5) {
      setIslandOffsetPx(Math.round(nextShift));
    }
  }, [islandOffsetPx]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) {
      setIslandOffsetPx(0);
      return;
    }
    clampIslandToViewport();
  }, [isOpen, isRtl, clampIslandToViewport]);

  // Close popover on outside click and Escape + clamp to viewport on resize
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      clampIslandToViewport();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, clampIslandToViewport]);

  const handleSyncClick = async () => {
    try {
      setCheckMessage(null);
      const preview = await checkForGlobalUpdates(activeBlockId, { force: true });
      if (preview && (preview.hasChanges || preview.isOutOfDate)) {
        setIsOpen(false);
        navigate('/studio');
      } else {
        setCheckMessage(t.bank.syncedBadge);
      }
    } catch {
      setCheckMessage(t.bank.syncWarning);
    }
  };

  return (
    <div className="relative inline-flex items-center shrink-0" ref={popoverRef}>
      {/* Interactive Trigger Capsule — Responsive across 320px to 4K */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        data-testid="question-bank-status-trigger"
        title={t.bank.syncCenter.statusTitle}
        aria-label={t.bank.syncCenter.statusTitle}
        className={`flex items-center gap-1.5 sm:gap-2 bg-white/60 dark:bg-zinc-800/60 hover:bg-white/85 dark:hover:bg-zinc-800/85 backdrop-blur-md border border-white/80 dark:border-zinc-700/70 px-2.5 sm:px-3 py-1.5 rounded-2xl text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer shadow-xs transition-all duration-200 hover:-translate-y-0.5 shrink-0 whitespace-nowrap apple-tap ${
          isOpen ? 'ring-2 ring-blue-500/40 bg-white/95 dark:bg-zinc-800/95' : ''
        }`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              hasActionableUpdates ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              hasActionableUpdates ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </span>

        {/* Ultra-wide desktop (2xl+): Full Block label */}
        <span className="hidden 2xl:inline">
          {block?.shortName || t.nav.activeBlockPrefix} · {block?.code || 'Block 206'} · {questions.length} {t.bank.syncCenter.questionsShort}
        </span>

        {/* Standard Laptop / MacBook Air (xl to 2xl): Compact label */}
        <span className="hidden xl:inline 2xl:hidden">
          {block?.shortName || t.nav.activeBlockPrefix} · {questions.length} {t.bank.syncCenter.questionsShort}
        </span>

        {/* Compact Laptop, Tablet & Mobile (<xl): Number + Qs */}
        <span className="xl:hidden font-mono text-[11px]">
          {questions.length} <span className="hidden xs:inline">{t.bank.syncCenter.questionsShort}</span>
        </span>

        {hasActionableUpdates && (
          <span className="ltr-isolate px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 shrink-0">
            v{remoteRev}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Apple-Caliber Viewport-Safe Frosted Glass Island Popover */}
      {isOpen && (
        <div
          ref={islandRef}
          role="dialog"
          aria-label={t.bank.syncCenter.blockTitle}
          data-testid="question-bank-status-island"
          style={islandOffsetPx !== 0 ? { transform: `translateX(${islandOffsetPx}px)` } : undefined}
          className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] sm:absolute sm:left-auto sm:right-0 rtl:sm:right-auto rtl:sm:left-0 sm:top-full sm:mt-2.5 z-50"
        >
          <div className="w-full sm:w-[21rem] md:w-[22rem] max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-zinc-700/80 shadow-[0_20px_60px_rgba(15,23,42,0.22)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-4 sm:p-5 space-y-3.5 animate-spring-modal-in">
          {/* Header — Wrapped cleanly so Local v7.0 -> Global v8.0 never overflows */}
          <div className="flex flex-col gap-2 border-b border-slate-200/60 dark:border-zinc-800/60 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate">
                    {t.bank.syncCenter.blockTitle}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                  {t.bank.syncCenter.officialBank}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label={t.common.close}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  hasActionableUpdates
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/25'
                }`}
              >
                <span>
                  {t.bank.syncCenter.localLabel} <span className="ltr-isolate font-mono">v{localRev}.0</span>
                </span>
                {hasNewGlobalRevision ? (
                  <>
                    <span>{isRtl ? '←' : '→'}</span>
                    <span>
                      {t.bank.syncCenter.globalLabel} <span className="ltr-isolate font-mono">v{remoteRev}.0</span>
                    </span>
                  </>
                ) : (
                  <span>({t.bank.syncCenter.upToDateBadge})</span>
                )}
              </span>
            </div>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-2.5 text-xs p-3 rounded-2xl bg-slate-100/75 dark:bg-zinc-900/65 border border-slate-200/60 dark:border-zinc-800/60">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Database className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.bank.syncCenter.localLabel}</span>
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {questions.length}{' '}
                <span className="text-xs font-normal text-slate-400">
                  {t.bank.syncCenter.questionsShort}
                </span>
              </div>
            </div>
            <div className="min-w-0 border-s border-slate-200 dark:border-zinc-800 ps-2.5">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.bank.syncCenter.edgeStatus}</span>
              </span>
              <div className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1 leading-tight break-words">
                {t.bank.edgeVerified}
              </div>
            </div>
          </div>

          {/* Check result feedback */}
          {checkMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 animate-apple-entrance">
              {checkMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-0.5">
            {/* Sync Now */}
            <button
              type="button"
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-xs font-bold transition-all cursor-pointer apple-tap disabled:opacity-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {isSyncing
                    ? t.bank.syncing
                    : hasActionableUpdates
                    ? t.bank.reviewChangesBtn
                    : t.bank.checkUpdatesBtn}
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-70 shrink-0">
                {t.bank.syncCenter.deltaLabel}
              </span>
            </button>

            {/* Reset to Global Bank */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowResetModal(true);
              }}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 text-xs font-bold transition-all cursor-pointer apple-tap"
            >
              <div className="flex items-center gap-2 min-w-0">
                <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="truncate">{t.bank.resetToGlobalBtn}</span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-70 shrink-0">
                {pendingDiffPreview?.remoteCanonicalCount ?? defaultCvsBank.length}{' '}
                {t.bank.syncCenter.canonicalShort}
              </span>
            </button>
          </div>
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
