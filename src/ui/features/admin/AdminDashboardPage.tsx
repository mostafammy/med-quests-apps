import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  Sliders,
  History,
  Users,
  BarChart3,
  Globe,
  Cpu,
  Search,
  Ban,
  Loader2,
  Trash2,
  CheckCircle2,
  BookOpen,
  Laptop,
  Smartphone,
} from 'lucide-react';
import { QuestionBankGovernancePanel } from './QuestionBankGovernancePanel.tsx';
import { useAuthStore, type GovernanceViewTab } from '../../../application/stores/useAuthStore.ts';
import type { UserRole, FeatureFlagKey } from '../../../domain/auth/types.ts';
import {
  computePlatformAnalytics,
  filterManagedUsers,
  type AiFeatureFilterMode,
  type RestrictionFilterMode,
} from '../../../domain/auth/governanceAnalytics.ts';

const FEATURE_FLAG_META: ReadonlyArray<{
  readonly key: FeatureFlagKey;
  readonly title: string;
  readonly description: string;
}> = [
  {
    key: 'ai_cloud_streaming_quota',
    title: 'Cloud AI Co-Pilot Streaming',
    description:
      'Activates high-speed Groq/Gemini cloud reasoning. Turn OFF to exclude this user and restrict to local offline tutor.',
  },
  {
    key: 'question_studio_author',
    title: 'Question Studio Authoring (/studio)',
    description:
      'Grants access to author, edit, and verify clinical vignettes in the faculty Question Studio.',
  },
  {
    key: 'multi_block_unlock',
    title: 'Multi-Block Curriculum Access',
    description:
      'Unlocks early access to upcoming organ system blocks alongside Cardiovascular (CVS).',
  },
  {
    key: 'cloud_sync_backup',
    title: 'Cloud CRDT Progress Synchronization',
    description:
      'Enables cross-device background synchronization of attempts, SM-2 cards, and notes.',
  },
];

export const AdminDashboardPage: React.FC = () => {
  const {
    authState,
    activeGovernanceTab,
    managedUsers,
    selectedManagedUserId,
    auditLogs,
    setGovernanceTab,
    selectManagedUser,
    updateUserRole,
    setUserRestriction,
    signInWithGoogle,
    purgeDemoData,
    revalidate,
  } = useAuthStore();

  useEffect(() => {
    void revalidate();
  }, [revalidate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [restrictionFilter, setRestrictionFilter] = useState<RestrictionFilterMode>('all');
  const [aiFeatureFilter, setAiFeatureFilter] = useState<AiFeatureFilterMode>('all');
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const analytics = useMemo(() => computePlatformAnalytics(managedUsers), [managedUsers]);

  const filteredUsers = useMemo(
    () =>
      filterManagedUsers(managedUsers, {
        searchQuery,
        roleFilter,
        restrictionFilter,
        aiFeatureFilter,
      }),
    [managedUsers, searchQuery, roleFilter, restrictionFilter, aiFeatureFilter]
  );

  const navigate = useNavigate();

  const handleAdminSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  const isAdmin = authState.status === 'authenticated-active' && authState.user.role === 'admin';
  const isFaculty = authState.status === 'authenticated-active' && authState.user.role === 'faculty-reviewer';
  const isAuthorized = isAdmin || isFaculty;
  const isAuthenticatedNonAdmin = authState.status === 'authenticated-active' && !isAuthorized;

  // =========================================================================
  // GUEST / UNAUTHORIZED ACCESS GATE (ZERO-TRUST SECURITY ENFORCEMENT)
  // =========================================================================
  if (!isAuthorized) {
    if (isAuthenticatedNonAdmin) {
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
                <span className="font-mono font-bold uppercase text-red-600 dark:text-red-400">Unauthorized Role</span>
              </div>
              <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 break-all bg-white/80 dark:bg-zinc-950/80 p-2.5 rounded-xl border border-red-200/60 dark:border-red-900/40">
                {authState.user.email} <span className="text-zinc-400 font-normal">({authState.user.role})</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Authorized Owner: <span className="font-mono text-zinc-700 dark:text-zinc-300">mostafa.yaser.developer@gmail.com</span>
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void handleAdminSignIn()}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 py-3.5 px-4 font-semibold text-sm shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer apple-tap"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    <span>Switching Google Account...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Administrator Account</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 py-3 px-4 font-medium text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer transition-all apple-tap"
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
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">Strict Verification</span>
            </div>
            <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 break-all bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
              mostafa.yaser.developer@gmail.com
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Authentication is verified directly by Google. Only authorized administrator accounts will be granted access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleAdminSignIn()}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 py-3.5 px-4 font-semibold text-sm shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer apple-tap"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED PLATFORM OWNER & ADMIN DASHBOARD VIEW
  // =========================================================================
  const selectedRecord =
    managedUsers.find((u) => u.profile.id === selectedManagedUserId) ??
    filteredUsers[0] ??
    managedUsers[0];

  const targetUser = selectedRecord?.profile;
  const targetEntitlements = selectedRecord?.entitlements;

  const handleToggleFeature = async (flag: FeatureFlagKey) => {
    if (!targetUser || !targetEntitlements) return;
    const currentVal = Boolean(targetEntitlements[flag]);
    await updateUserRole(targetUser.id, targetUser.role, { [flag]: !currentVal });
  };

  const handleEnforceRestriction = async (status: 'active' | 'blocked' | 'suspended') => {
    if (!targetUser) return;
    const defaultReason =
      status === 'blocked'
        ? 'Administrative security ban: policy violation / credential sharing.'
        : status === 'suspended'
        ? 'Temporary 24h security hold: anomalous multi-region session activity.'
        : null;
    const untilIso =
      status === 'suspended'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

    await setUserRestriction(
      targetUser.id,
      status,
      blockReasonInput.trim() || defaultReason,
      untilIso
    );
    setBlockReasonInput('');
  };

  return (
    <div className="space-y-6 animate-apple-entrance">
      {/* Top Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-red-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-inner">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
                Enterprise Governance & Analytics
              </h1>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Platform Owner Active
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Live Cloudflare edge telemetry across {analytics.totalUsers} scholars • Per-user AI quota management & instantaneous KV session enforcement
            </p>
          </div>
        </div>

        {/* Global Edge Health Badge & Production Clean Action */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Workers KV Latency: ~{analytics.globalAvgEdgeLatencyMs}ms</span>
          </div>

          <button
            type="button"
            onClick={() => void purgeDemoData()}
            title="Clean up all demo accounts and keep only verified platform accounts"
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 px-3 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-xs cursor-pointer transition-colors apple-tap"
          >
            <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
            <span>Clean Demo Data</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/60 pb-3 dark:border-zinc-800/60">
        {[
          {
            id: 'question-bank' as const,
            label: 'Question Bank & Review Queue',
            icon: BookOpen,
            badge: 'Curriculum Cockpit',
          },
          ...(isAdmin
            ? [
                {
                  id: 'cohort-analytics' as const,
                  label: 'Global Cohort & Telemetry Stats',
                  icon: BarChart3,
                  badge: `${analytics.totalUsers} Users`,
                },
                {
                  id: 'user-directory' as const,
                  label: 'User Directory, AI Toggles & Bans',
                  icon: Users,
                  badge: `${analytics.aiCloudEnabledUsersCount} AI Active`,
                },
                {
                  id: 'audit-trail' as const,
                  label: 'Security Audit Log',
                  icon: History,
                  badge: `${auditLogs.length} Events`,
                },
              ]
            : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeGovernanceTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGovernanceTab(tab.id as GovernanceViewTab)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB: QUESTION BANK & REVIEW QUEUE */}
      {activeGovernanceTab === 'question-bank' && <QuestionBankGovernancePanel />}

      {/* TAB 1: COHORT ANALYTICS */}
      {activeGovernanceTab === 'cohort-analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className="text-[11px] font-medium text-zinc-500">Total Scholars</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
                  {analytics.totalUsers}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">Active</span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className="text-[11px] font-medium text-zinc-500">Global Questions Practiced</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
                  {analytics.globalTotalAttempts.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-blue-500">Attempts</span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className="text-[11px] font-medium text-zinc-500">Cloud AI Active Scholars</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-indigo-600 dark:text-indigo-400">
                  {analytics.aiCloudEnabledUsersCount}
                </span>
                <span className="text-[10px] font-semibold text-zinc-400">
                  / {analytics.aiCloudExcludedUsersCount} Excluded
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className="text-[11px] font-medium text-zinc-500">Global Average Accuracy</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                  {analytics.globalAverageAccuracy}%
                </span>
                <span className="text-[10px] font-semibold text-emerald-500">CVS Block</span>
              </div>
            </div>
          </div>

          {/* Colos & Hardware Breakdown */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <Globe className="h-4 w-4 text-blue-500" />
                <span>Cloudflare Global Edge Traffic (Top Colos)</span>
              </div>
              <div className="space-y-2">
                {analytics.coloDistribution.slice(0, 5).map((colo) => (
                  <div key={colo.colo} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold">{colo.colo} ({colo.countryCode})</span>
                    <span className="text-zinc-500">{colo.activeSessionsCount} active sessions</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <Cpu className="h-4 w-4 text-indigo-500" />
                <span>Hardware Compositor Adaptation</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Ultra Tier (120Hz ProMotion Spring)</span>
                  <span className="font-mono font-bold text-indigo-500">{analytics.tierBreakdown.ultra} devices</span>
                </div>
                <div className="flex justify-between">
                  <span>Balanced Tier (60fps GPU Compositor)</span>
                  <span className="font-mono font-bold text-blue-500">{analytics.tierBreakdown.balanced} devices</span>
                </div>
                <div className="flex justify-between">
                  <span>Low-Spec Saver (&lt;16ms Input)</span>
                  <span className="font-mono font-bold text-emerald-500">{analytics.tierBreakdown['low-spec']} devices</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER DIRECTORY & CONTROLS */}
      {activeGovernanceTab === 'user-directory' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* User Directory List */}
          <div className="space-y-3 lg:col-span-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, university, colo..."
                className="w-full rounded-xl border border-zinc-200/80 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: 'All Users', mode: 'all' as const },
                { label: 'AI Active', mode: 'ai-enabled' as const },
                { label: 'AI Excluded', mode: 'ai-excluded' as const },
              ].map((pill) => (
                <button
                  key={pill.mode}
                  type="button"
                  onClick={() => setAiFeatureFilter(pill.mode)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    aiFeatureFilter === pill.mode
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-200/60 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-none outline-none"
              >
                <option value="all">All Roles</option>
                <option value="scholar">Scholars</option>
                <option value="faculty">Faculty</option>
                <option value="contributor">Contributors</option>
                <option value="fellow">Fellows</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={restrictionFilter}
                onChange={(e) => setRestrictionFilter(e.target.value as RestrictionFilterMode)}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-none outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="restricted">Restricted / Banned</option>
                <option value="anomalous">Anomalous</option>
              </select>
            </div>

            {managedUsers.length <= 1 && (
              <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Pristine Production Mode:</strong> Demo data is cleaned up. As medical scholars sign in with Google OAuth, their cloud profiles and telemetry will populate here dynamically.
                </p>
              </div>
            )}

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredUsers.map((record) => {
                const u = record.profile;
                const isSelected = u.id === selectedRecord?.profile.id;
                const isAiAllowed = Boolean(record.entitlements.ai_cloud_streaming_quota);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectManagedUser(u.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/10 shadow-sm dark:bg-amber-500/15'
                        : 'border-zinc-200/70 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{u.displayName}</div>
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {u.email}
                      {u.phoneNumber ? ` • 📞 ${u.phoneNumber}` : ''}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>
                        {record.activeSessions.length} device{record.activeSessions.length === 1 ? '' : 's'} •{' '}
                        {record.activeSessions[0]?.device.deviceName ||
                          record.activeSessions[0]?.device.osName ||
                          'No active session'}
                      </span>
                      <span className={isAiAllowed ? 'text-indigo-600 font-bold' : 'text-zinc-400'}>
                        {isAiAllowed ? 'AI Cloud Enabled' : 'AI Excluded'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Details & Controls */}
          {targetUser && (
            <div className="space-y-5 lg:col-span-7">
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {targetUser.displayName}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {targetUser.email}
                      {targetUser.phoneNumber ? ` • 📞 ${targetUser.phoneNumber}` : ''} •{' '}
                      {targetUser.universityName}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    targetUser.restriction.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-500/20 text-red-700 dark:text-red-300'
                  }`}>
                    {targetUser.restriction.status}
                  </span>
                </div>

                {/* Linked Devices & Economic / Luxury Market Tier Intelligence */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-zinc-400">
                      Linked Devices & Hardware Market Tier ({selectedRecord?.activeSessions.length ?? 0})
                    </h4>
                    <span className="text-[10px] font-mono text-indigo-500">
                      Synced with Cloudflare D1
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(selectedRecord?.activeSessions ?? []).map((sess) => {
                      const isDesktop = sess.device.deviceCategory === 'desktop';
                      const tierBadgeColor =
                        sess.device.marketTier === 'flagship-luxury'
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : sess.device.marketTier === 'upper-midrange'
                          ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                          : sess.device.marketTier === 'economical'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300';

                      return (
                        <div
                          key={sess.sessionId}
                          className="rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850 p-3 text-xs space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isDesktop ? (
                                <Laptop className="h-4 w-4 text-indigo-500" />
                              ) : (
                                <Smartphone className="h-4 w-4 text-emerald-500" />
                              )}
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {sess.device.deviceName || `${sess.device.osName} • ${sess.device.browserName}`}
                              </span>
                              {sess.device.deviceModelCode && (
                                <span className="rounded bg-zinc-200/80 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                                  {sess.device.deviceModelCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${tierBadgeColor}`}
                              >
                                {sess.device.marketTierLabel || 'Mid-Range Mainstream'}
                              </span>
                              {sess.device.estimatedPriceSegment && (
                                <span className="font-mono text-[10px] text-zinc-500">
                                  {sess.device.estimatedPriceSegment}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>
                              OS: <strong>{sess.device.osName} {sess.device.osVersion || ''}</strong>
                            </span>
                            <span>
                              Browser: <strong>{sess.device.browserName} {sess.device.browserVersion || ''}</strong>
                            </span>
                            {sess.device.gpuRenderer && (
                              <span>
                                GPU: <strong>{sess.device.gpuRenderer}</strong>
                              </span>
                            )}
                            {sess.hardwareProfile && (
                              <span>
                                Hardware: <strong>{sess.hardwareProfile.logicalCpuCores} Cores{sess.hardwareProfile.deviceMemoryGb ? ` / ${sess.hardwareProfile.deviceMemoryGb}GB RAM` : ''}</strong>
                              </span>
                            )}
                            <span>
                              Edge: <strong>{sess.edgeNetwork.colo} ({sess.edgeNetwork.city || sess.edgeNetwork.countryCode}) • {sess.edgeNetwork.ipAddress}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-User Feature Overrides */}
                <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <h4 className="text-xs font-bold uppercase text-zinc-400">Feature Access & AI Quotas</h4>
                  {FEATURE_FLAG_META.map((item) => {
                    const enabled = Boolean(targetEntitlements?.[item.key]);
                    return (
                      <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850">
                        <div>
                          <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{item.title}</div>
                          <div className="text-[11px] text-zinc-500">{item.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleToggleFeature(item.key)}
                          className={`h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                            enabled ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full bg-white transition-transform ${
                            enabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Ban / Suspension Controls */}
                <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 dark:border-red-500/30 dark:bg-red-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase">
                    <Ban className="h-4 w-4" />
                    <span>Platform Access Enforcement (Ban or Suspend)</span>
                  </div>
                  <input
                    type="text"
                    value={blockReasonInput}
                    onChange={(e) => setBlockReasonInput(e.target.value)}
                    placeholder="Enforcement reason (e.g. Terms violation)"
                    className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <div className="flex gap-2">
                    {targetUser.restriction.status !== 'active' ? (
                      <button
                        type="button"
                        onClick={() => void handleEnforceRestriction('active')}
                        className="rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        Reactivate Account
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleEnforceRestriction('suspended')}
                          className="rounded-xl bg-amber-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-700 cursor-pointer"
                        >
                          Suspend (24h)
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleEnforceRestriction('blocked')}
                          className="rounded-xl bg-red-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-red-700 cursor-pointer"
                        >
                          Permanently Ban
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeGovernanceTab === 'audit-trail' && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-3">
          <h3 className="font-heading text-sm font-bold text-zinc-800 dark:text-zinc-200">
            Immutable Security Audit Ledger
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{log.action}</span>
                  <span className="text-zinc-500 ml-2">{log.summary}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString()} • Colo: {log.edgeColo}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
