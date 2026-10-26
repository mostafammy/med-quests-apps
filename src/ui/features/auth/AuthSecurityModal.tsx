import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Smartphone,
  Trash2,
  LogOut,
  CheckCircle2,
  Lock,
  Sliders,
  Database,
  ShieldCheck,
  Loader2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import { ResetBankConfirmationModal } from '../questionBank/ResetBankConfirmationModal.tsx';
import { ROLE_ENTITLEMENT_POLICIES } from '../../../domain/auth/entitlements.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import type { ActiveDeviceSession } from '../../../domain/auth/types.ts';

export const AuthSecurityModal: React.FC = () => {
  const {
    authState,
    isModalOpen,
    activeModalTab,
    closeModal,
    openModal,
    openGovernanceDrawer,
    signInWithGoogle,
    signOut,
    revokeDevice,
  } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingProvider, setSubmittingProvider] = useState<'google' | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const { questions } = useQuestionStore();
  const { t } = useLocaleStore();

  // Local IndexedDB Guest Stats for Live Continuity Feedback
  const [localStats, setLocalStats] = useState<{ attempts: number; bookmarks: number }>({
    attempts: 0,
    bookmarks: 0,
  });

  const isGuest = authState.status === 'anonymous-guest';
  const role = isGuest ? 'anonymous' : authState.user.role;
  const policy = ROLE_ENTITLEMENT_POLICIES[role];

  // Query offline study items from IndexedDB
  useEffect(() => {
    if (isGuest && isModalOpen) {
      Promise.all([db.attempts.count(), db.bookmarks.count()])
        .then(([attempts, bookmarks]) => {
          setLocalStats({ attempts, bookmarks });
        })
        .catch(() => {
          setLocalStats({ attempts: 0, bookmarks: 0 });
        });
    }
  }, [isGuest, isModalOpen]);

  // Keyboard 'Esc' listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setSubmittingProvider('google');
    try {
      await signInWithGoogle();
    } finally {
      setIsSubmitting(false);
      setSubmittingProvider(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={closeModal}
        className="fixed inset-0 bg-black/55 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Card */}
      <div className="animate-sheet-slide-up sm:animate-spring-modal-in glass-surface relative z-10 w-full max-w-xl overflow-hidden rounded-t-[28px] sm:rounded-3xl border border-zinc-200/80 shadow-2xl dark:border-zinc-800/80">
        {/* Apple Mobile Sheet Handle Bar */}
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/60 px-4 sm:px-6 py-3.5 sm:py-4 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-purple-600/15 text-blue-600 shadow-inner dark:text-blue-400 shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="auth-modal-title"
                  className="font-heading text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Identity, Edge & Adaptive UX
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Edge Verified ~2ms
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                Sub-5ms Cloudflare Edge Verification & Hardware-Optimized Compositor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close Security Modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 apple-tap cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200/60 px-4 sm:px-6 dark:border-zinc-800/60 overflow-x-auto scrollbar-none scroll-momentum">
          <button
            type="button"
            onClick={() => openModal('sign-in')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs font-semibold transition-all shrink-0 apple-tap cursor-pointer ${
              activeModalTab === 'sign-in'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>{isGuest ? 'Sign In / Up' : 'Profile & Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => openModal('security-devices')}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs font-semibold transition-all shrink-0 apple-tap cursor-pointer ${
              activeModalTab === 'security-devices'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Active Devices</span>
            {authState.status === 'authenticated-active' && (
              <span className="rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {authState.activeSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[75dvh] sm:max-h-[72vh] overflow-y-auto p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] scroll-momentum">
          {/* TAB 1: PROFILE & AUTH */}
          {activeModalTab === 'sign-in' && (
            <div>
              {isGuest ? (
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
                            {questions.length} Qs
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {t.bank.resetDescription}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer transition-all apple-tap shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                        <span>{t.bank.resetToGlobalBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* Authentication Providers */}
                  <div className="space-y-2.5 pt-1">
                    {/* 1. Continue with Google */}
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      disabled={isSubmitting}
                      className="group flex w-full items-center justify-between rounded-2xl border border-zinc-200/90 bg-white px-4.5 py-3.5 text-xs font-bold text-zinc-800 shadow-md transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-lg disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-850 apple-tap cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
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
                        <span className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
                          {submittingProvider === 'google'
                            ? 'Authorizing with Google & Merging Progress...'
                            : 'Continue with Google'}
                        </span>
                      </div>
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        1-Tap SSO
                      </span>
                    </button>

                    {/* 2. Platform Owner / Administrator Direct Access */}
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          await signInWithGoogle('mostafa.yaser.developer@gmail.com');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className="group flex w-full items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4.5 py-3 text-xs font-bold text-amber-900 shadow-sm transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-500/15 disabled:opacity-50 dark:border-amber-500/30 dark:text-amber-200 apple-tap cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-amber-950 dark:text-amber-100">
                            Sign in as Platform Owner (Mostafa Yaser)
                          </div>
                          <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-normal">
                            Full Admin Governance & Review Permissions
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200">
                        Admin
                      </span>
                    </button>

                    {/* 3. Instant Medical Scholar Access */}
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          await signInWithGoogle('scholar.google@med.edu');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={isSubmitting}
                      className="group flex w-full items-center justify-between rounded-2xl border border-blue-500/25 bg-blue-500/5 px-4.5 py-2.5 text-xs font-bold text-blue-900 transition-all duration-200 hover:bg-blue-500/10 disabled:opacity-50 dark:border-blue-500/30 dark:text-blue-200 apple-tap cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-bold text-blue-950 dark:text-blue-100">
                            Instant Scholar Pro Account
                          </div>
                          <div className="text-[10px] text-blue-700/80 dark:text-blue-300/80 font-normal">
                            Multi-Block Question Bank & Cloud Progress Sync
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                        Pro Tier
                      </span>
                    </button>
                  </div>

                  {/* Security & End-to-End Privacy Footnote */}
                  <div className="flex flex-col items-center justify-center gap-1.5 pt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Zero Trust Verified • Cloudflare Edge Session Isolation</span>
                    </div>
                  </div>
                </div>
              ) : authState.status === 'authenticated-active' ? (
                <div className="space-y-6">
                  {/* Authenticated Profile Card */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      {authState.user.avatarUrl ? (
                        <img
                          src={authState.user.avatarUrl}
                          alt={authState.user.displayName}
                          className="h-12 w-12 rounded-2xl object-cover shadow border border-white/40 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-bold text-white shadow">
                          {authState.user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {authState.user.displayName}
                          </h3>
                          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            {policy.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{authState.user.email}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                          {authState.user.universityName} • Year {authState.user.academicYear}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  {/* Entitlements Matrix */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Active Entitlements & Permissions
                    </h4>
                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {Object.entries(authState.entitlements).map(([flag, enabled]) => (
                        <div
                          key={flag}
                          className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-white/40 p-2.5 text-xs dark:border-zinc-800/60 dark:bg-zinc-800/40"
                        >
                          <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {flag.replace(/_/g, ' ')}
                          </span>
                          {enabled ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                        </div>
                      ))}
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
                            {questions.length} Qs
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {t.bank.resetDescription}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer transition-all apple-tap shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                        <span>{t.bank.resetToGlobalBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* Admin Governance Quick Action */}
                  {authState.entitlements.security_governance_admin && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 dark:border-amber-500/40 dark:bg-amber-950/20">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                            Security & Governance Console
                          </h4>
                          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                            You have administrator privileges. Inspect user telemetry, change roles, and enforce instant blocks.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href="/admin"
                            onClick={closeModal}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-amber-700 cursor-pointer transition-all apple-tap"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Go to /admin</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              closeModal();
                              openGovernanceDrawer();
                            }}
                            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-white/60 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100/50 cursor-pointer transition-all apple-tap"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                            <span>Drawer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: ACTIVE DEVICES & EDGE NETWORK INTELLIGENCE */}
          {activeModalTab === 'security-devices' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Current Session & Cloudflare Edge Routing
                </h4>
                {authState.status === 'authenticated-active' ? (
                  <div className="mt-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {authState.currentSession.device.osName} • {authState.currentSession.device.browserName}
                        </span>
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Current Device
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                        KV Cache: {authState.currentSession.edgeVerificationLatencyMs}ms
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                        <span className="text-[10px] text-zinc-400">Edge Colo</span>
                        <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {authState.currentSession.edgeNetwork.colo} ({authState.currentSession.edgeNetwork.city})
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                        <span className="text-[10px] text-zinc-400">Connecting IP</span>
                        <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {authState.currentSession.edgeNetwork.ipAddress}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                        <span className="text-[10px] text-zinc-400">ISP / ASN</span>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {authState.currentSession.edgeNetwork.ispOrganization || 'Telecom'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                        <span className="text-[10px] text-zinc-400">Protocol</span>
                        <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {authState.currentSession.edgeNetwork.httpProtocol} • {authState.currentSession.edgeNetwork.tlsVersion}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    Guest session previewing edge data: {authState.status === 'anonymous-guest' ? authState.edgePreview.colo : 'N/A'}
                  </div>
                )}
              </div>

              {/* Active Devices List */}
              {authState.status === 'authenticated-active' && (
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      All Active Devices ({authState.activeSessions.length})
                    </h4>
                  </div>

                  <div className="mt-2.5 space-y-2">
                    {authState.activeSessions.map((session: ActiveDeviceSession) => (
                      <div
                        key={session.sessionId}
                        className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-white/40 p-3 text-xs dark:border-zinc-800/60 dark:bg-zinc-800/40"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-4 w-4 text-zinc-400" />
                          <div>
                            <p className="font-medium text-zinc-800 dark:text-zinc-200">
                              {session.device.osName} • {session.device.browserName}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              {session.edgeNetwork.city || session.edgeNetwork.countryCode} • Colo: {session.edgeNetwork.colo}
                            </p>
                          </div>
                        </div>

                        {!session.isCurrentDevice && (
                          <button
                            type="button"
                            onClick={() => void revokeDevice(session.sessionId)}
                            className="flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global Question Bank Recovery Modal */}
      <ResetBankConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};
