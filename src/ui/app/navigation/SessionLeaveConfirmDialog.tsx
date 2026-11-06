import React, { useEffect } from 'react';
import { AlertTriangle, Bookmark, ArrowRight, X } from 'lucide-react';
import { useSessionLeaveDialogStore } from '../../../application/curriculum/SessionLeaveGuard.ts';
import { compositionRoot } from '../../../application/composition/clientCompositionRoot.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';

export const SessionLeaveConfirmDialog: React.FC = () => {
  const { isOpen, fromBlockId, toBlockId, answeredCount, totalCount, confirm, cancel } =
    useSessionLeaveDialogStore();
  const { locale } = useLocaleStore();

  const fromPack = compositionRoot.catalog.get(fromBlockId);
  const toPack = compositionRoot.catalog.get(toBlockId);

  const fromName = fromPack?.manifest.block.name[locale] || fromPack?.manifest.block.name.en || fromBlockId.toUpperCase();
  const toName = toPack?.manifest.block.name[locale] || toPack?.manifest.block.name.en || toBlockId.toUpperCase();

  // Keyboard accessibility: Escape to stay, Enter to save & switch
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cancel, confirm]);

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-leave-title"
      aria-describedby="session-leave-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md animate-apple-entrance"
    >
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-5">
        {/* Close Button */}
        <button
          onClick={cancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start space-x-3.5 rtl:space-x-reverse">
          <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 id="session-leave-title" className="text-lg font-bold text-slate-900 dark:text-zinc-100 leading-tight">
              Pause Session &amp; Switch Block?
            </h2>
            <p id="session-leave-desc" className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              You have an in-progress session in <strong className="text-slate-700 dark:text-zinc-300">{fromName}</strong> ({answeredCount}/{totalCount} answered).
              Your progress will be saved automatically so you can resume anytime.
            </p>
          </div>
        </div>

        {/* Progress Preview Strip */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-600 dark:text-zinc-300 font-semibold">
            <Bookmark className="w-4 h-4 text-blue-500" />
            <span>Auto-Save Enabled</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-zinc-400">
            {answeredCount} of {totalCount} Questions Saved
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={confirm}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer apple-tap"
          >
            <span>Save &amp; Switch to {toName}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancel}
            className="py-3 px-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-2xl text-xs font-semibold transition-all cursor-pointer apple-tap"
          >
            Stay in {fromName}
          </button>
        </div>
      </div>
    </div>
  );
};
