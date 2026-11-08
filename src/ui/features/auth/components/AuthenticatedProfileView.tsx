import React from 'react';
import {
  LogOut,
  Phone,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import type { AuthUser } from '../../../../domain/auth/types.ts';
import type { RoleEntitlementPolicy } from '../../../../domain/auth/entitlements.ts';
import type { TranslationDictionary } from '../../../../domain/i18n/types.ts';

interface AuthenticatedProfileViewProps {
  user: AuthUser;
  policy: RoleEntitlementPolicy;
  entitlements: Record<string, boolean>;
  onSignOut: () => void;
  phoneInput: string;
  onPhoneChange: (value: string) => void;
  isSavingPhone: boolean;
  phoneSavedSuccess: boolean;
  onSavePhone: () => void;
  questionsCount: number;
  t: TranslationDictionary;
  onOpenResetModal: () => void;
  hasAdminEntitlement?: boolean;
  onCloseModal: () => void;
  onOpenGovernanceDrawer: () => void;
}

export const AuthenticatedProfileView: React.FC<AuthenticatedProfileViewProps> = ({
  user,
  policy,
  entitlements,
  onSignOut,
  phoneInput,
  onPhoneChange,
  isSavingPhone,
  phoneSavedSuccess,
  onSavePhone,
  questionsCount,
  t,
  onOpenResetModal,
  hasAdminEntitlement,
  onCloseModal,
  onOpenGovernanceDrawer,
}) => {
  return (
    <div className="space-y-5">
      {/* Authenticated Profile Card */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-12 w-12 rounded-2xl object-cover shadow border border-white/40 dark:border-zinc-700"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-bold text-white shadow">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {user.displayName}
              </h3>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                {policy.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
            <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              {user.universityName} • Year {user.academicYear}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Primary Communication Channel: Phone Number / WhatsApp Card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 sm:p-4.5 dark:border-emerald-500/30 dark:from-emerald-950/30 dark:via-teal-950/20">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/25">
            <Phone className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                Primary Communication Channel (WhatsApp / Mobile)
              </h4>
              {user.phoneNumber ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 animate-pulse">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">
              We use your phone number as our primary direct channel to notify you about syllabus changes, study reminders, and official medical board errata alerts.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="w-full rounded-xl border border-emerald-500/40 bg-white/90 dark:bg-zinc-900/90 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <button
                type="button"
                disabled={isSavingPhone || !phoneInput.trim()}
                onClick={onSavePhone}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 apple-tap cursor-pointer shrink-0"
              >
                {isSavingPhone ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : phoneSavedSuccess ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
                <span>{phoneSavedSuccess ? 'Saved!' : 'Save Mobile Number'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Entitlements Matrix */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Active Entitlements & Permissions
        </h4>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(entitlements).map(([flag, enabled]) => (
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

      {/* Admin Governance Quick Action */}
      {hasAdminEntitlement && (
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
                onClick={onCloseModal}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-amber-700 cursor-pointer transition-all apple-tap"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Go to /admin</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  onCloseModal();
                  onOpenGovernanceDrawer();
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
  );
};
