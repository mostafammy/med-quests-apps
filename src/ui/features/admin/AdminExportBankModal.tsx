import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldCheck,
  Lock,
  X,
  Loader2,
  CheckCircle2,
  Database,
  FileJson,
  KeyRound,
  AlertOctagon,
} from 'lucide-react';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { useBankGovernanceStore } from '../../../application/stores/useBankGovernanceStore.ts';

export interface AdminExportBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockId?: string;
  isAdmin?: boolean;
}

export const AdminExportBankModal: React.FC<AdminExportBankModalProps> = ({
  isOpen,
  onClose,
  blockId = 'cvs',
  isAdmin: propIsAdmin,
}) => {
  const { questions, syncCursor, exportBankJson } = useQuestionStore();
  const { authState, showToast } = useAuthStore();
  const { catalogQuestions, kpis } = useBankGovernanceStore();
  const { t } = useLocaleStore();

  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ count: number; filename: string } | null>(null);

  const isAdmin =
    propIsAdmin !== undefined
      ? propIsAdmin
      : authState.status === 'authenticated-active' && authState.user.role === 'admin';
  const totalQuestions = questions.length || catalogQuestions.length;
  const currentRevision = syncCursor?.serverRevision ?? kpis?.currentBlockRevision ?? 1;

  const operatorDisplayName =
    authState.status === 'authenticated-active'
      ? authState.user.displayName
      : isAdmin
      ? 'Authoritative Platform Admin'
      : 'Unauthorized Guest';
  const operatorRole =
    authState.status === 'authenticated-active'
      ? authState.user.role
      : isAdmin
      ? 'admin'
      : 'guest';

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessInfo(null);
      setIsExporting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecuteExport = async () => {
    if (!isAdmin) {
      setErrorMessage(
        'Unauthorized (403): Only verified platform administrators can export the master question bank.'
      );
      return;
    }

    try {
      setIsExporting(true);
      setErrorMessage(null);

      // 1. Invoke fortified store export (which asserts admin session & writes immutable security audit log)
      const jsonStr = exportBankJson(blockId);
      const parsed = JSON.parse(jsonStr) as unknown[];
      const count = Array.isArray(parsed) ? parsed.length : totalQuestions;

      // 2. Trigger browser secure file download
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `medquests-master-bank-${blockId}-rev${currentRevision}-${Date.now()}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 3. Apple-grade visual feedback & toast notification
      setSuccessInfo({ count, filename });
      showToast('success', `${t.bank.exportSuccessToast} (${count} questions exported)`);

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to export master question bank.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-apple-entrance"
    >
      {/* Frosted Glass Backdrop */}
      <div
        onClick={() => {
          if (!isExporting) onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Apple Glassmorphic Card Surface */}
      <div className="glass-surface relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 dark:border-amber-500/40 shadow-2xl p-6 sm:p-7 space-y-5 animate-spring-modal-in">
        {/* Header Pill & Dismiss Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shadow-inner shrink-0">
              <KeyRound className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Admin Governance Console Exclusive
              </span>
              <h3
                id="admin-export-modal-title"
                className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1"
              >
                {t.bank.exportModalTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confidential Intellectual Property Notice */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Core Revenue & Intellectual Property Asset</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/80">
            {t.bank.exportConfidentialNotice}
          </p>
        </div>

        {/* Telemetry & Metadata Inspection Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Database className="w-3 h-3 text-indigo-500" />
              Target Block
            </span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
              {blockId.toUpperCase()} (Block 206)
            </p>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              Revision #{currentRevision}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <FileJson className="w-3 h-3 text-amber-500" />
              Dataset Volume
            </span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
              {totalQuestions} Questions
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Canonical & Verified
            </p>
          </div>
        </div>

        {/* Authenticated Actor Signature Box */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 p-3 text-[11px] flex items-center justify-between">
          <span className="text-slate-500 dark:text-zinc-400">Authorized Operator</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">
            {operatorDisplayName} ({operatorRole})
          </span>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successInfo && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-apple-entrance">
            <div className="flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Downloaded {successInfo.count} questions ({successInfo.filename})</span>
            </div>
          </div>
        )}

        {/* Modal Action Controls */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700/80 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || successInfo !== null || !isAdmin}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 apple-tap"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting Master Archive...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{t.bank.exportMasterBankBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
