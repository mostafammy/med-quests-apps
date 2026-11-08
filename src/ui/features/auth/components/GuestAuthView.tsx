import React from 'react';
import { Database, CheckCircle2, RotateCcw, Loader2, ShieldCheck } from 'lucide-react';
import type { TranslationDictionary } from '../../../../domain/i18n/types.ts';

interface GuestAuthViewProps {
  localStats: { attempts: number; bookmarks: number };
  questionsCount: number;
  t: TranslationDictionary;
  onOpenResetModal: () => void;
  isSubmitting: boolean;
  submittingProvider: 'google' | null;
  onGoogleSignIn: () => void;
}

export const GuestAuthView: React.FC<GuestAuthViewProps> = ({
  localStats,
  questionsCount,
  t,
  onOpenResetModal,
  isSubmitting,
  submittingProvider,
  onGoogleSignIn,
}) => {
  return (
    <div className="space-y-5">
      {/* Production-Grade Local-First Continuity Card */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent p-4 sm:p-4.5 dark:border-blue-500/30 dark:from-blue-950/30 dark:via-indigo-950/20">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/25">
            <Database className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-blue-950 dark:text-blue-100">
                Local-First Guest Continuity
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                IndexedDB Sync Ready
              </span>
            </div>
            <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-200/80">
              {localStats.attempts > 0 || localStats.bookmarks > 0 ? (
                <>
                  Detected <span className="font-bold text-blue-950 dark:text-white">{localStats.attempts} offline question attempt(s)</span> and <span className="font-bold text-blue-950 dark:text-white">{localStats.bookmarks} bookmark(s)</span> in your browser. Signing in seamlessly merges your study history into your cloud profile without losing a single attempt.
                </>
              ) : (
                <>
                  You are currently studying offline. Any questions you practice are saved in local IndexedDB. Signing in will seamlessly merge your study history without losing a single attempt.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Question Bank Recovery & Sync Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {t.bank.title}
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {questionsCount} Qs
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.bank.resetDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenResetModal}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer transition-all apple-tap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
            <span>{t.bank.resetToGlobalBtn}</span>
          </button>
        </div>
      </div>

      {/* Primary Authentication Provider: Google Only */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={isSubmitting}
          className="group flex w-full items-center justify-between rounded-2xl border border-blue-500/30 bg-gradient-to-r from-white via-zinc-50 to-blue-50/20 px-5 py-4 text-xs font-bold text-zinc-800 shadow-md transition-all duration-200 hover:border-blue-500/50 hover:shadow-lg disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-850 apple-tap cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            {submittingProvider === 'google' ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : (
              <svg className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <div className="text-left">
              <div className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {submittingProvider === 'google'
                  ? 'Authorizing with Google & Merging Progress...'
                  : 'Continue with Google'}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                Sign in to save your name, email & sync study progress across devices
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
            1-Tap SSO
          </span>
        </button>
      </div>

      {/* Security & End-to-End Privacy Footnote */}
      <div className="flex flex-col items-center justify-center gap-1.5 pt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Google Identity Verified • Cloudflare Edge Zero Trust Session</span>
        </div>
      </div>
    </div>
  );
};
