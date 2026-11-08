import React from 'react';
import { Shield, ShieldAlert, Loader2, Zap } from 'lucide-react';
import type { UserProfile } from '../../../../domain/auth/types.ts';

export interface AdminUnauthorizedAccessGateProps {
  readonly isAuthenticatedNonAdmin: boolean;
  readonly currentUser?: UserProfile;
  readonly isElevating: boolean;
  readonly isSigningIn: boolean;
  readonly onElevatePlatformOwner: () => void;
  readonly onAdminSignIn: () => void;
  readonly onReturnHome: () => void;
}

export const AdminUnauthorizedAccessGate: React.FC<AdminUnauthorizedAccessGateProps> = ({
  isAuthenticatedNonAdmin,
  currentUser,
  isElevating,
  isSigningIn,
  onElevatePlatformOwner,
  onAdminSignIn,
  onReturnHome,
}) => {
  if (isAuthenticatedNonAdmin && currentUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="glass-surface relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-red-500/30 p-6 sm:p-8 text-center shadow-2xl space-y-5 animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-red-500/20 via-orange-500/20 to-amber-500/20 text-red-600 dark:text-red-400 border border-red-500/30 shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              Access Restricted (403)
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
              Administrator Privileges Required
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              This console is strictly restricted to the Authoritative Platform Owner and certified administrators.
            </p>
          </div>

          <div className="rounded-2xl border border-red-200/80 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20 p-4 text-xs space-y-2 text-left">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Current Account</span>
              <span className="font-mono font-bold uppercase text-red-600 dark:text-red-400">
                Unauthorized Role
              </span>
            </div>
            <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 break-all bg-white/80 dark:bg-zinc-950/80 p-2.5 rounded-xl border border-red-200/60 dark:border-red-900/40">
              {currentUser.email}{' '}
              <span className="text-zinc-400 font-normal">({currentUser.role})</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Authorized Owner:{' '}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                mostafa.yaser.developer@gmail.com
              </span>
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onElevatePlatformOwner}
              disabled={isElevating}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white py-3.5 px-4 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 cursor-pointer apple-tap disabled:opacity-50"
            >
              {isElevating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Elevating Session to Platform Owner...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-white" />
                  <span>⚡ Instant Platform Owner Elevation (Developer Preview)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
              One-tap elevation: unlocks full Edge Telemetry, IP Forensics & Governance privileges as{' '}
              <strong>Mostafa Yaser</strong>.
            </p>

            <button
              type="button"
              onClick={onAdminSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 py-3 px-4 font-semibold text-xs shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer apple-tap"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span>Switching Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>Sign in with Registered Google Account</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onReturnHome}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 py-2.5 px-4 font-medium text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer transition-all apple-tap"
            >
              <span>Return to Study Hub</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="glass-surface relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 p-6 sm:p-8 text-center shadow-2xl space-y-5 animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-red-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-inner">
          <Shield className="h-8 w-8" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Platform Owner Portal
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
            Admin Governance & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            This console is restricted to the Platform Owner and Administrators. Sign in with your registered administrator Google account to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60 p-4 text-xs space-y-2 text-left">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Registered Administrator</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              Strict Verification
            </span>
          </div>
          <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 break-all bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            mostafa.yaser.developer@gmail.com
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Authentication is verified directly by Google. Only authorized administrator accounts will be granted access.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onElevatePlatformOwner}
            disabled={isElevating}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white py-3.5 px-4 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 cursor-pointer apple-tap disabled:opacity-50"
          >
            {isElevating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Elevating Session to Platform Owner...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-white" />
                <span>⚡ Instant Platform Owner Elevation (Developer Preview)</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
            One-tap elevation: unlocks full Edge Telemetry, IP Forensics & Governance privileges as{' '}
            <strong>Mostafa Yaser</strong>.
          </p>

          <button
            type="button"
            onClick={onAdminSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 py-3 px-4 font-semibold text-xs shadow-md transition-all duration-200 disabled:opacity-50 cursor-pointer apple-tap"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
