import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, X, Loader2, Database, ShieldCheck } from 'lucide-react';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';

export interface ResetBankConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (report: { resetCount: number; revision: number }) => void;
  blockId?: string;
}

export const ResetBankConfirmationModal: React.FC<ResetBankConfirmationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  blockId = 'cvs',
}) => {
  const { questions, isSyncing, resetLocalBankToGlobal } = useQuestionStore();
  const { t } = useLocaleStore();
  const { showToast } = useAuthStore();
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResetting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isResetting, onClose]);

  if (!isOpen) return null;

  const handleConfirmReset = async () => {
    try {
      setIsResetting(true);
      setErrorMessage(null);
      const res = await resetLocalBankToGlobal(blockId);
      showToast(
        'success',
        `${t.bank.resetSuccessToast} (${res.resetCount} questions, Rev #${res.revision})`
      );
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to restore canonical question bank.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-apple-entrance"
    >
      {/* Frosted Glass Backdrop */}
      <div
        onClick={() => {
          if (!isResetting) onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Surface Card */}
      <div className="glass-surface relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-rose-500/30 dark:border-rose-500/40 shadow-2xl p-6 sm:p-7 space-y-6 animate-spring-modal-in">
        {/* Header Icon & Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/25 shadow-inner shrink-0">
              <RotateCcw className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                {t.bank.title}
              </span>
              <h3
                id="reset-modal-title"
                className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1"
              >
                {t.bank.resetConfirmTitle}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Explanation */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
          {t.bank.resetDescription}
        </p>

        {/* State Contrast Comparison Card */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Database className="w-3 h-3" />
              Local Storage
            </span>
            <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
              {questions.length} <span className="text-xs font-normal text-slate-500">questions</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">IndexedDB cache</p>
          </div>
          <div className="space-y-1 border-l border-slate-200 dark:border-zinc-800 pl-3 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-3">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Cloudflare Edge / D1
            </span>
            <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
              106 <span className="text-xs font-normal text-slate-500">canonical</span>
            </div>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">{t.bank.edgeVerified}</p>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="flex items-start space-x-2.5 rtl:space-x-reverse p-3.5 rounded-2xl bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/25 text-rose-900 dark:text-rose-200 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{t.bank.resetConfirmDialog}</span>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirmReset}
            disabled={isResetting || isSyncing}
            className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isResetting || isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.bank.syncing}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>{t.bank.resetToGlobalBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
