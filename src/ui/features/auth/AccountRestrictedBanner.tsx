import React from 'react';
import { ShieldAlert, Globe, ArrowRight, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';

export const AccountRestrictedBanner: React.FC = () => {
  const { authState, signOut } = useAuthStore();

  if (authState.status !== 'account-blocked') {
    return null;
  }

  const { restriction, edgeNetwork, user } = authState;

  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 backdrop-blur-md transition-all duration-300 dark:border-red-500/30 dark:bg-red-950/30"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base font-semibold text-red-900 dark:text-red-200">
                Account Access Restricted
              </h3>
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-red-700 dark:text-red-300">
                {restriction.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-red-800/90 dark:text-red-300/80">
              {restriction.blockedReason || 'This account has been flagged for administrative review.'}
            </p>
            {restriction.blockedUntil && (
              <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/80">
                Restriction active until: {new Date(restriction.blockedUntil).toLocaleString()}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-red-800/70 dark:text-red-300/60">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                User: {user.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Edge Gateway: {edgeNetwork.colo} ({edgeNetwork.city || edgeNetwork.countryCode})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:shrink-0">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-white/80 px-3.5 py-2 text-xs font-medium text-red-900 shadow-sm transition-all hover:bg-white hover:shadow dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-zinc-800"
          >
            <span>Continue as Local Guest</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
