import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';

export interface ResetStatsConfirmationModalProps {
  readonly isOpen: boolean;
  readonly resetting: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export const ResetStatsConfirmationModal: React.FC<ResetStatsConfirmationModalProps> = ({
  isOpen,
  resetting,
  onClose,
  onConfirm,
}) => {
  const { t } = useLocaleStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 border border-white/80 dark:border-zinc-800 shadow-2xl space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">{t.dashboard.resetModalTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t.dashboard.resetModalDesc}
          </p>
        </div>
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {t.dashboard.resetCancelBtn}
          </button>
          <button
            onClick={onConfirm}
            disabled={resetting}
            className="py-2 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
          >
            {resetting ? t.dashboard.resetting : t.dashboard.resetConfirmBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
