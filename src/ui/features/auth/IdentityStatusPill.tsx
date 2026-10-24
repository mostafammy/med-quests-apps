import React from 'react';
import { Shield, Sparkles, User } from 'lucide-react';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';
import { ROLE_ENTITLEMENT_POLICIES } from '../../../domain/auth/entitlements.ts';

export const IdentityStatusPill: React.FC = () => {
  const { authState, openModal } = useAuthStore();

  const isGuest = authState.status === 'anonymous-guest';
  const role = isGuest ? 'anonymous' : authState.user.role;
  const policy = ROLE_ENTITLEMENT_POLICIES[role];
  const displayName = isGuest ? 'Local Scholar' : authState.user.displayName;

  // Prefetch AuthSecurityModal chunk on hover or keyboard focus
  const handlePrefetch = () => {
    void import('./AuthSecurityModal.tsx');
  };

  const getBadgeColors = () => {
    switch (policy.badgeTone) {
      case 'amber':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'emerald':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'indigo':
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
      case 'blue':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300';
      default:
        return 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <button
      type="button"
      onClick={() => openModal()}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      aria-label={`Account: ${displayName} (${policy.label}). Click to manage profile and devices.`}
      className="glass-pill-luxury flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 shrink-0 apple-tap"
    >
      {/* Role Pill */}
      <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${getBadgeColors()}`}>
        {role === 'admin' ? (
          <Shield className="h-3 w-3" />
        ) : role === 'student-pro' ? (
          <Sparkles className="h-3 w-3 text-indigo-500" />
        ) : isGuest ? (
          <User className="h-3 w-3 opacity-70" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        )}
        <span className="max-w-[80px] sm:max-w-none truncate">{policy.label}</span>
      </span>

      {/* User Display Name (Authenticated) or Sign In Prompt (Guest) */}
      <span className="hidden items-center text-[11px] font-medium text-zinc-700 dark:text-zinc-300 sm:flex max-w-[120px] truncate">
        {isGuest ? 'Sign In' : displayName}
      </span>
    </button>
  );
};
