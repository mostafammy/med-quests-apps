import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Sliders,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle,
  History,
  Users,
  BarChart3,
  Sparkles,
  Globe,
  Cpu,
  Search,
  Activity,
  Ban,
  GraduationCap,
  CheckCircle2,
  Laptop,
  Smartphone,
} from 'lucide-react';
import {
  useAuthStore,
  type GovernanceViewTab,
} from '../../../application/stores/useAuthStore.ts';
import type { UserRole, FeatureFlagKey, PerformanceOverrideMode } from '../../../domain/auth/types.ts';
import { ROLE_ENTITLEMENT_POLICIES } from '../../../domain/auth/entitlements.ts';
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

export const AdminGovernanceDrawer: React.FC = () => {
  const {
    authState,
    isGovernanceDrawerOpen,
    activeGovernanceTab,
    managedUsers,
    selectedManagedUserId,
    auditLogs,
    closeGovernanceDrawer,
    setGovernanceTab,
    selectManagedUser,
    updateUserRole,
    setUserRestriction,
    quarantineAnomalousAccounts,
    performanceOverride,
    setPerformanceOverride,
  } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [restrictionFilter, setRestrictionFilter] = useState<RestrictionFilterMode>('all');
  const [aiFeatureFilter, setAiFeatureFilter] = useState<AiFeatureFilterMode>('all');
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);

  const analytics = useMemo(
    () => computePlatformAnalytics(managedUsers),
    [managedUsers]
  );

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

  if (!isGovernanceDrawerOpen) return null;

  if (authState.status !== 'authenticated-active' || authState.user.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          onClick={closeGovernanceDrawer}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />
        <div className="glass-surface relative z-10 max-w-md rounded-2xl p-6 text-center shadow-xl">
          <Shield className="mx-auto h-10 w-10 text-red-500" />
          <h3 className="mt-3 font-heading text-base font-semibold">Access Denied</h3>
          <p className="mt-1 text-xs text-zinc-500">
            This console requires Platform Administrator privileges.
          </p>
          <button
            type="button"
            onClick={closeGovernanceDrawer}
            className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const selectedRecord =
    managedUsers.find((u) => u.profile.id === selectedManagedUserId) ??
    filteredUsers[0] ??
    managedUsers[0];

  const targetUser = selectedRecord?.profile;
  const targetEntitlements = selectedRecord?.entitlements;
  const targetStats = selectedRecord?.studyTelemetry;
  const isTargetBlocked = targetUser?.restriction.status === 'blocked';
  const isTargetSuspended = targetUser?.restriction.status === 'suspended';

  const handleRoleChange = async (newRole: UserRole) => {
    if (!targetUser) return;
    await updateUserRole(targetUser.id, newRole);
  };

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="governance-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={closeGovernanceDrawer}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Wide Enterprise Slide-out Command Center */}
      <div className="animate-drawer-slide-in glass-surface fixed inset-y-0 right-0 z-10 flex w-full max-w-4xl flex-col border-l border-zinc-200/70 shadow-2xl dark:border-zinc-800/80">
        {/* Top Command Header */}
        <div className="flex flex-col gap-3 border-b border-zinc-200/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 shadow-inner dark:text-amber-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="governance-drawer-title"
                  className="font-heading text-base font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Enterprise Governance, AI Entitlements & Cohort Analytics
                </h2>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  KV Edge ~{analytics.globalAvgEdgeLatencyMs}ms
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Real-time telemetry across {analytics.totalUsers} medical scholars • Per-user AI activation, feature blocking & instant KV session eviction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeGovernanceDrawer}
            aria-label="Close Governance Command Center"
            className="flex h-8 w-8 items-center justify-center self-end rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 sm:self-auto dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200/60 bg-zinc-100/50 px-4 py-2 sm:px-6 dark:border-zinc-800/60 dark:bg-zinc-900/50">
          {(
            [
              {
                id: 'cohort-analytics',
                label: 'Global Cohort & Telemetry Stats',
                icon: BarChart3,
                badge: `${analytics.totalUsers} Users`,
              },
              {
                id: 'user-directory',
                label: 'User Directory, AI Toggles & Bans',
                icon: Users,
                badge: `${analytics.aiCloudEnabledUsersCount} AI Active`,
              },
              {
                id: 'audit-trail',
                label: 'Security Audit Log',
                icon: History,
                badge: `${auditLogs.length}`,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeGovernanceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGovernanceTab(tab.id as GovernanceViewTab)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-amber-600 shadow-xs border border-zinc-200/80 dark:bg-zinc-800 dark:text-amber-400 dark:border-zinc-700'
                    : 'text-zinc-600 hover:bg-white/60 dark:text-zinc-400 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className="rounded-full bg-zinc-200/70 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ========================================================= */}
          {/* TAB 1: GLOBAL COHORT & TELEMETRY ANALYTICS DASHBOARD      */}
          {/* ========================================================= */}
          {activeGovernanceTab === 'cohort-analytics' && (
            <div className="space-y-6">
              {/* Top 4 Global KPI Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>Total Platform Scholars</span>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {analytics.totalUsers}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {analytics.activeUsersCount} active • {analytics.blockedOrSuspendedCount} restricted
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {analytics.totalActiveSessions} live edge device sessions
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>Global Study Telemetry</span>
                    <Activity className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {analytics.globalTotalAttempts.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      attempts
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {analytics.globalAverageAccuracy}% Mean Accuracy • {analytics.globalAverageMastery}% Mastery
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>Cloud AI Entitlements</span>
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {analytics.aiCloudEnabledUsersCount}
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      enabled ({analytics.aiCloudExcludedUsersCount} excluded)
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {analytics.totalDailyAiRequestsUsed} / {analytics.totalDailyAiRequestsCapacity} daily AI calls used
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>Edge KV Cache Speed</span>
                    <Globe className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {analytics.globalAvgEdgeLatencyMs}ms
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {analytics.globalKvHitRatePercent}% KV Hit
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    HTTP/3 + TLSv1.3 zero-blocking verification
                  </p>
                </div>
              </div>

              {/* Security Anomaly Radar Banner */}
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 sm:flex-row sm:items-center dark:border-red-500/30 dark:bg-red-950/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      Edge Security & Account-Sharing Anomaly Radar
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Detected{' '}
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {analytics.anomalousUsersCount} user(s)
                    </span>{' '}
                    with security flags: Impossible Travel ({analytics.anomalyBreakdown.impossible_travel_geo_shift}), Excessive Concurrent Devices ({analytics.anomalyBreakdown.excessive_concurrent_devices}), High Threat IP ({analytics.anomalyBreakdown.high_threat_ip_score}).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setRestrictionFilter('anomalous');
                      setGovernanceTab('user-directory');
                    }}
                    className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer dark:border-red-800 dark:bg-zinc-900 dark:text-red-300"
                  >
                    Inspect Flagged Users
                  </button>
                  <button
                    type="button"
                    onClick={() => void quarantineAnomalousAccounts()}
                    className="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 cursor-pointer"
                  >
                    Quarantine Flagged Accounts
                  </button>
                </div>
              </div>

              {/* University Cohort Performance Table */}
              <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      University Cohort Performance & AI Adoption
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Aggregated from collected study attempts & mastery cards
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200/70 text-[11px] uppercase text-zinc-400 dark:border-zinc-800">
                        <th className="pb-2 font-semibold">Medical Institution</th>
                        <th className="pb-2 font-semibold">Scholars</th>
                        <th className="pb-2 font-semibold">Total Attempts</th>
                        <th className="pb-2 font-semibold">Mean Accuracy</th>
                        <th className="pb-2 font-semibold">Block Mastery</th>
                        <th className="pb-2 font-semibold">Cloud AI Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/60">
                      {analytics.universityCohorts.map((cohort) => (
                        <tr key={cohort.universityName} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                          <td className="py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                            {cohort.universityName}
                          </td>
                          <td className="py-2.5 text-zinc-600 dark:text-zinc-400">
                            {cohort.scholarsCount}
                          </td>
                          <td className="py-2.5 font-mono text-zinc-700 dark:text-zinc-300">
                            {cohort.totalAttempts.toLocaleString()}
                          </td>
                          <td className="py-2.5">
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
                              {cohort.avgAccuracy}%
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                              {cohort.avgMastery}%
                            </span>
                          </td>
                          <td className="py-2.5 text-zinc-600 dark:text-zinc-400">
                            {cohort.aiEnabledCount} / {cohort.scholarsCount} scholars
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Two-Column Breakdown: Edge Colocations & Client Hardware Tiers */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Cloudflare Edge PoP Distribution */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Cloudflare Edge Data Centers (request.cf)
                    </h4>
                  </div>
                  <div className="space-y-2.5">
                    {analytics.coloDistribution.map((c) => (
                      <div
                        key={c.colo}
                        className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-50/70 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-800/40"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            {c.colo}
                          </span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {c.city ?? c.countryCode} ({c.countryCode})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>{c.activeSessionsCount} sess</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {c.avgLatencyMs}ms
                          </span>
                          <span>{c.kvHitRatioPercent}% KV hit</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Adaptive Hardware Compositor Tiers & Roles */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Client Hardware Tiers & Role Distribution
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-50/70 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
                      <span className="font-medium">Ultra Tier (120Hz ProMotion Spring)</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {analytics.tierBreakdown.ultra} devices
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-50/70 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
                      <span className="font-medium">Balanced Tier (60fps GPU Compositor)</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {analytics.tierBreakdown.balanced} devices
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-zinc-50/70 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
                      <span className="font-medium">Low-Spec Saver (Zero-Blur &lt;16ms Input)</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {analytics.tierBreakdown['low-spec']} devices
                      </span>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {(['student-free', 'student-pro', 'faculty-reviewer', 'admin'] as UserRole[]).map(
                        (r) => (
                          <span
                            key={r}
                            className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {ROLE_ENTITLEMENT_POLICIES[r].label}: {analytics.roleBreakdown[r]}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: USER DIRECTORY, PER-USER AI TOGGLES & BAN CONSOLE   */}
          {/* ========================================================= */}
          {activeGovernanceTab === 'user-directory' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Searchable & Filterable User Directory (5 cols) */}
              <div className="space-y-3 lg:col-span-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, university, colo..."
                    className="w-full rounded-xl border border-zinc-200/80 bg-white/80 pl-9 pr-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { label: 'All Users', mode: 'all' },
                      { label: 'AI Active', mode: 'ai-enabled' },
                      { label: 'AI Excluded', mode: 'ai-excluded' },
                    ] as const
                  ).map((pill) => (
                    <button
                      key={pill.mode}
                      type="button"
                      onClick={() => setAiFeatureFilter(pill.mode)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        aiFeatureFilter === pill.mode
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-200/60 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}

                  {(
                    [
                      { label: 'Restricted / Banned', mode: 'restricted' },
                      { label: 'Anomalous', mode: 'anomalous' },
                    ] as const
                  ).map((pill) => (
                    <button
                      key={pill.mode}
                      type="button"
                      onClick={() =>
                        setRestrictionFilter(
                          restrictionFilter === pill.mode ? 'all' : pill.mode
                        )
                      }
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        restrictionFilter === pill.mode
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-200/60 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}

                  {(['all', 'student-free', 'student-pro', 'faculty-reviewer'] as const).map(
                    (r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoleFilter(r)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                          roleFilter === r
                            ? 'bg-amber-500/20 text-amber-800 border border-amber-500/40 dark:text-amber-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400'
                        }`}
                      >
                        {r === 'all' ? 'Any Role' : r}
                      </button>
                    )
                  )}
                </div>

                {/* User Cards List */}
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredUsers.map((item) => {
                    const isSelected = item.profile.id === targetUser?.id;
                    const isRestricted = item.profile.restriction.status !== 'active';
                    const hasAnomaly = item.activeSessions.some(
                      (s) => s.anomalyFlags.length > 0
                    );
                    const hasAi = item.entitlements.ai_cloud_streaming_quota;

                    return (
                      <button
                        key={item.profile.id}
                        type="button"
                        onClick={() => selectManagedUser(item.profile.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-sm dark:border-amber-500/80 dark:bg-amber-500/10'
                            : 'border-zinc-200/70 bg-white/50 hover:bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-heading text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {item.profile.displayName}
                              </span>
                              {isRestricted && (
                                <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700 dark:text-red-300">
                                  {item.profile.restriction.status}
                                </span>
                              )}
                              {hasAnomaly && !isRestricted && (
                                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">
                                  Anomaly
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                              {item.profile.email}
                            </p>
                            <p className="truncate text-[10px] text-zinc-400">
                              {item.profile.universityName}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {ROLE_ENTITLEMENT_POLICIES[item.profile.role].label}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between border-t border-zinc-200/50 pt-2 text-[10px] text-zinc-500 dark:border-zinc-800/60 dark:text-zinc-400">
                          <span>
                            {item.studyTelemetry.totalAttempts} Qs • {item.studyTelemetry.overallAccuracy}% acc
                          </span>
                          <span
                            className={`font-semibold ${
                              hasAi
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-400 line-through'
                            }`}
                          >
                            {hasAi ? 'Cloud AI Active' : 'AI Excluded'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected User Inspector, AI Toggles & Ban Controls (7 cols) */}
              {targetUser && targetEntitlements && targetStats && (
                <div className="space-y-5 lg:col-span-7">
                  {/* Target User Header & Collected Study Telemetry */}
                  <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-base font-bold text-white shadow">
                          {targetUser.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {targetUser.displayName}
                            </h3>
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                              {targetUser.role}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                targetUser.restriction.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-red-500/20 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {targetUser.restriction.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {targetUser.email} • {targetUser.universityName} (Year {targetUser.academicYear})
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* User's Collected Study & AI Usage Metrics */}
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-white/80 p-2.5 dark:bg-zinc-800/60">
                        <span className="text-[10px] uppercase text-zinc-400">Attempts</span>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {targetStats.totalAttempts}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-2.5 dark:bg-zinc-800/60">
                        <span className="text-[10px] uppercase text-zinc-400">Accuracy</span>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {targetStats.overallAccuracy}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-2.5 dark:bg-zinc-800/60">
                        <span className="text-[10px] uppercase text-zinc-400">CVS Mastery</span>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {targetStats.masteryPercentage}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-2.5 dark:bg-zinc-800/60">
                        <span className="text-[10px] uppercase text-zinc-400">Daily Cloud AI</span>
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {targetStats.dailyAiRequestsUsed} / {selectedRecord.dailyAiRequestsLimit}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role Assignment Matrix */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      1. Assigned Role Tier
                    </h4>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(
                        ['student-free', 'student-pro', 'faculty-reviewer', 'admin'] as UserRole[]
                      ).map((r) => {
                        const pol = ROLE_ENTITLEMENT_POLICIES[r];
                        const isSelected = targetUser.role === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => void handleRoleChange(r)}
                            className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                : 'border-zinc-200/70 bg-white/40 hover:bg-white/70 dark:border-zinc-800 dark:bg-zinc-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">{pol.label}</span>
                              {isSelected && (
                                <CheckCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-zinc-400">
                              Max {pol.maxConcurrentDevices} dev • {pol.dailyCloudAiRequestsLimit} AI/d
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-User Feature Activation & Exclusion (AI & Platform Features) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        2. Per-User Feature Activation & Exclusion Overrides
                      </h4>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Overrides Role Defaults Instantly
                      </span>
                    </div>
                    <div className="mt-2 space-y-2">
                      {FEATURE_FLAG_META.map((item) => {
                        const enabled = Boolean(targetEntitlements[item.key]);
                        const isOverridden =
                          item.key in (targetUser.customFeatureOverrides ?? {});
                        return (
                          <div
                            key={item.key}
                            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white/50 p-3 text-xs dark:border-zinc-800/70 dark:bg-zinc-800/40"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {item.title}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-400">
                                  ({item.key})
                                </span>
                                {isOverridden && (
                                  <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-300">
                                    Custom Override
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {item.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={enabled}
                              aria-label={`Toggle ${item.title} for ${targetUser.displayName}`}
                              onClick={() => void handleToggleFeature(item.key)}
                              className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                enabled ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 rounded-full bg-white shadow-md transform transition-transform ${
                                  enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-Level Account Ban / Suspension & Instant KV Eviction */}
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 dark:border-red-500/30 dark:bg-red-950/20">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <Ban className="h-4 w-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        3. Platform Access Enforcement (Suspend or Ban Account)
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-red-800/80 dark:text-red-300/80">
                      Blocking or suspending immediately purges all active session tokens from Cloudflare Workers KV (`usr_guard:{targetUser.id}`) and returns `403 ACCOUNT_BLOCKED`.
                    </p>

                    {targetUser.restriction.status !== 'active' && (
                      <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-900 dark:text-red-200">
                        <strong>Current Restriction ({targetUser.restriction.status.toUpperCase()}):</strong>{' '}
                        {targetUser.restriction.blockedReason || 'Administrative hold'}
                      </div>
                    )}

                    <input
                      type="text"
                      value={blockReasonInput}
                      onChange={(e) => setBlockReasonInput(e.target.value)}
                      placeholder="Enforcement reason (e.g., Credential sharing across CAI & FRA colos)"
                      className="mt-3 w-full rounded-xl border border-red-300 bg-white/90 px-3 py-2 text-xs text-zinc-900 shadow-xs focus:outline-none dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(isTargetBlocked || isTargetSuspended) && (
                        <button
                          type="button"
                          onClick={() => void handleEnforceRestriction('active')}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 cursor-pointer"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Unblock / Restore Access</span>
                        </button>
                      )}

                      {!isTargetSuspended && (
                        <button
                          type="button"
                          onClick={() => void handleEnforceRestriction('suspended')}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-amber-700 cursor-pointer"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Suspend (24h Hold)</span>
                        </button>
                      )}

                      {!isTargetBlocked && (
                        <button
                          type="button"
                          onClick={() => void handleEnforceRestriction('blocked')}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 cursor-pointer"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Ban / Block Account Immediately</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4. Hardware Telemetry, Client Signals & Edge Security Forensics */}
                  {(() => {
                    const currentActiveSession =
                      selectedRecord.activeSessions[selectedSessionIdx] ??
                      selectedRecord.activeSessions[0];
                    const hwProfile =
                      currentActiveSession?.hardwareProfile ?? authState.clientProfile;
                    const edgeNet = currentActiveSession?.edgeNetwork;

                    return (
                      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-indigo-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                              4. Background Hardware Telemetry & Edge Forensics
                            </h4>
                          </div>
                          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                            Cloudflare D1 & KV
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Silently captured device and network telemetry. Regular learners are never shown these technical metrics.
                        </p>

                        {/* Multi-Device Selector if user has multiple sessions */}
                        {selectedRecord.activeSessions.length > 1 && (
                          <div className="flex flex-wrap gap-1.5 border-b border-zinc-200/60 pb-3 dark:border-zinc-800/60">
                            {selectedRecord.activeSessions.map((session, idx) => (
                              <button
                                key={session.sessionId}
                                type="button"
                                onClick={() => setSelectedSessionIdx(idx)}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                                  selectedSessionIdx === idx
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white/80 text-zinc-600 hover:bg-white dark:bg-zinc-800/60 dark:text-zinc-400'
                                }`}
                              >
                                {session.device.deviceCategory === 'desktop' ? (
                                  <Laptop className="h-3 w-3" />
                                ) : (
                                  <Smartphone className="h-3 w-3" />
                                )}
                                <span>
                                  {session.device.osName} ({session.edgeNetwork.colo})
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Hardware Signals Grid */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Client Hardware & Display Metrics
                          </span>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                            <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                              <span className="text-[10px] text-zinc-400">Logical CPU Cores</span>
                              <p className="mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {hwProfile.logicalCpuCores} Cores
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                              <span className="text-[10px] text-zinc-400">Device Memory Tier</span>
                              <p className="mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {hwProfile.deviceMemoryGb !== null ? `${hwProfile.deviceMemoryGb} GB RAM` : 'Apple / Safari Tier'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                              <span className="text-[10px] text-zinc-400">Effective Network</span>
                              <p className="mt-0.5 text-xs font-bold uppercase text-zinc-900 dark:text-zinc-100">
                                {hwProfile.effectiveNetworkType}
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                              <span className="text-[10px] text-zinc-400">Pixel Ratio (DPR)</span>
                              <p className="mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {hwProfile.devicePixelRatio}x Retina
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                              <span className="text-[10px] text-zinc-400">Reduced Motion</span>
                              <p className="mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                {hwProfile.prefersReducedMotion ? 'Active (0ms)' : 'Off (Full Dynamics)'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                              <span className="text-[10px] text-zinc-400">Client Timezone</span>
                              <p className="mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {hwProfile.clientTimezone}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Edge Network Forensics */}
                        {edgeNet && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Cloudflare Edge Network & Security Telemetry
                            </span>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                              <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                                <span className="text-[10px] text-zinc-400">Connecting IP</span>
                                <p className="mt-0.5 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                  {edgeNet.ipAddress}
                                </p>
                              </div>
                              <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                                <span className="text-[10px] text-zinc-400">Edge Colo</span>
                                <p className="mt-0.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                  {edgeNet.colo} ({edgeNet.city || edgeNet.countryCode})
                                </p>
                              </div>
                              <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                                <span className="text-[10px] text-zinc-400">ISP / ASN</span>
                                <p className="mt-0.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {edgeNet.ispOrganization || 'Telecom'} (AS{edgeNet.asn ?? 'N/A'})
                                </p>
                              </div>
                              <div className="rounded-xl border border-zinc-200/60 bg-white/70 p-2.5 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                                <span className="text-[10px] text-zinc-400">Protocol & TLS</span>
                                <p className="mt-0.5 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                  {edgeNet.httpProtocol} • {edgeNet.tlsVersion}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Admin Adaptive Compositor Override Diagnostics */}
                        <div className="border-t border-zinc-200/60 pt-3 dark:border-zinc-800/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Adaptive Compositor Simulator (Admin Testing)
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                              Active: {performanceOverride.toUpperCase()} ({hwProfile.activeTier})
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            Test and audit how the UI fluidly adapts across 120fps physics, 60fps GPU, and zero-blur low-spec modes.
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {(['auto', 'ultra', 'balanced', 'low-spec'] as PerformanceOverrideMode[]).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setPerformanceOverride(mode)}
                                className={`rounded-xl border p-2 text-left transition-all cursor-pointer ${
                                  performanceOverride === mode
                                    ? 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200'
                                    : 'border-zinc-200/70 bg-white/60 hover:bg-white dark:border-zinc-800 dark:bg-zinc-800/40'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase">{mode}</span>
                                  {performanceOverride === mode && (
                                    <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  )}
                                </div>
                                <p className="mt-0.5 text-[9px] text-zinc-400">
                                  {mode === 'auto'
                                    ? 'Dynamic'
                                    : mode === 'ultra'
                                    ? '120fps Physics'
                                    : mode === 'balanced'
                                    ? '60fps GPU'
                                    : 'Zero-blur Saver'}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: IMMUTABLE SECURITY & GOVERNANCE AUDIT LOG          */}
          {/* ========================================================= */}
          {activeGovernanceTab === 'audit-trail' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <History className="h-4 w-4 text-amber-500" />
                  <span>Immutable Edge Governance & KV Eviction Audit Stream</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  D1 Table: security_audit_log
                </span>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col justify-between gap-2 rounded-2xl border border-zinc-200/70 bg-white/60 p-3.5 text-xs sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900/60"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            log.action.includes('BLOCKED') || log.action.includes('QUARANTINED')
                              ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                              : log.action.includes('FEATURE')
                              ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.targetDisplayName}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          by {log.actorDisplayName}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">{log.summary}</p>
                    </div>
                    <div className="flex items-center gap-3 self-end font-mono text-[11px] text-zinc-400 sm:self-center shrink-0">
                      <span>Colo: {log.edgeColo}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {log.latencyMs}ms
                      </span>
                      <span>{log.createdAt.slice(0, 19).replace('T', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
