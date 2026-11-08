import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Sliders,
  History,
  Users,
  BarChart3,
  Sparkles,
  Globe,
  Activity,
  ExternalLink,
  Trash2,
  BookOpen,
  Zap,
  UploadCloud,
} from 'lucide-react';
import { QuestionBankGovernancePanel } from '../admin/QuestionBankGovernancePanel.tsx';
import { AdminAccuracyAuditCenter } from '../admin/accuracyAudit/AdminAccuracyAuditCenter.tsx';
import { AdminAiQuestionParserLab } from '../admin/aiQuestionParser/AdminAiQuestionParserLab.tsx';
import { LiveEdgeObservabilityPortal } from '../admin/observability/LiveEdgeObservabilityPortal.tsx';
import { AdminNetworkTelemetryTab } from '../admin/governanceTabs/AdminNetworkTelemetryTab.tsx';
import { AdminCohortAnalyticsTab } from '../admin/governanceTabs/AdminCohortAnalyticsTab.tsx';
import { AdminUserDirectoryTab } from '../admin/governanceTabs/AdminUserDirectoryTab.tsx';
import { AdminSecurityAuditTrailTab } from '../admin/governanceTabs/AdminSecurityAuditTrailTab.tsx';
import {
  useAuthStore,
  type GovernanceViewTab,
} from '../../../application/stores/useAuthStore.ts';
import type { UserRole } from '../../../domain/auth/types.ts';
import {
  computePlatformAnalytics,
  filterManagedUsers,
  type AiFeatureFilterMode,
  type RestrictionFilterMode,
} from '../../../domain/auth/governanceAnalytics.ts';

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
    signInWithGoogle,
    elevateToPlatformOwner,
    purgeDemoData,
  } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [restrictionFilter, setRestrictionFilter] = useState<RestrictionFilterMode>('all');
  const [aiFeatureFilter, setAiFeatureFilter] = useState<AiFeatureFilterMode>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

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

  const allSessionsWithUser = useMemo(
    () =>
      managedUsers.flatMap((u) =>
        u.activeSessions.map((sess) => ({
          ...sess,
          user: u.profile,
          userRecord: u,
        }))
      ),
    [managedUsers]
  );

  const distinctIps = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSessionsWithUser) {
      if (s.edgeNetwork?.ipAddress) set.add(s.edgeNetwork.ipAddress);
    }
    return Array.from(set);
  }, [allSessionsWithUser]);

  const distinctColos = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSessionsWithUser) {
      if (s.edgeNetwork?.colo) set.add(s.edgeNetwork.colo);
    }
    return Array.from(set);
  }, [allSessionsWithUser]);

  const distinctGpus = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSessionsWithUser) {
      if (s.device.gpuRenderer) set.add(s.device.gpuRenderer);
    }
    return Array.from(set);
  }, [allSessionsWithUser]);

  const handleCopyIp = (ip: string) => {
    void navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => {
      setCopiedIp((curr) => (curr === ip ? null : curr));
    }, 2000);
  };

  if (!isGovernanceDrawerOpen) return null;

  if (authState.status !== 'authenticated-active' || authState.user.role !== 'admin') {
    const isAuthenticatedNonAdmin = authState.status === 'authenticated-active';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          onClick={closeGovernanceDrawer}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />
        <div className="glass-surface relative z-10 max-w-md w-full rounded-3xl p-6 sm:p-7 text-center shadow-2xl space-y-4 border border-amber-500/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-inner">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
              Platform Owner Portal
            </span>
            <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Admin Governance Console
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {isAuthenticatedNonAdmin
                ? `Signed in as ${authState.user.email} (${authState.user.role}). Administrator privileges required.`
                : 'Restricted to Platform Owner (mostafa.yaser.developer@gmail.com) and administrators.'}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void elevateToPlatformOwner()}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white py-3 px-4 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all apple-tap"
            >
              <Zap className="h-4 w-4" />
              <span>⚡ One-Click Elevation (Mostafa Yaser)</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await signInWithGoogle();
              }}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 py-2.5 px-4 font-semibold text-xs shadow-sm cursor-pointer transition-all apple-tap"
            >
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
              <span>
                {isAuthenticatedNonAdmin
                  ? 'Switch to Administrator Account'
                  : 'Sign in with Google'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={closeGovernanceDrawer}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const selectedRecord =
    managedUsers.find((u) => u.profile.id === selectedManagedUserId) ??
    filteredUsers[0] ??
    managedUsers[0];

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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void purgeDemoData()}
              title="Clean up legacy demo user accounts and restore pristine production directory"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
              <span>Clean Demo</span>
            </button>

            <a
              href="/admin"
              onClick={closeGovernanceDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors cursor-pointer"
              title="Open full-screen Admin Dashboard page"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Full Page</span>
            </a>

            <button
              type="button"
              onClick={closeGovernanceDrawer}
              aria-label="Close Governance Command Center"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200/60 bg-zinc-100/50 px-4 py-2 sm:px-6 dark:border-zinc-800/60 dark:bg-zinc-900/50 overflow-x-auto">
          {(
            [
              {
                id: 'cloud-observability',
                label: 'Live Edge & Cohort',
                icon: Activity,
                badge: '100% SLA',
              },
              {
                id: 'network-telemetry',
                label: 'Live Edge Network & IPs',
                icon: Globe,
                badge: `${distinctIps.length} IPs`,
              },
              {
                id: 'cohort-analytics',
                label: 'Global Cohort & Telemetry',
                icon: BarChart3,
                badge: `${analytics.totalUsers} Scholars`,
              },
              {
                id: 'user-directory',
                label: 'User Directory & AI Toggles',
                icon: Users,
                badge: `${analytics.aiCloudEnabledUsersCount} AI Active`,
              },
              {
                id: 'question-bank',
                label: 'Question Bank & Review',
                icon: BookOpen,
                badge: 'Curriculum',
              },
              {
                id: 'ai-question-parser',
                label: 'AI Ingestion Lab',
                icon: UploadCloud,
                badge: 'Multi-Model',
              },
              {
                id: 'accuracy-audit',
                label: 'Accuracy Audit Lab',
                icon: Sparkles,
                badge: 'Apple QA',
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
          {activeGovernanceTab === 'cloud-observability' && <LiveEdgeObservabilityPortal />}

          {activeGovernanceTab === 'network-telemetry' && (
            <AdminNetworkTelemetryTab
              allSessionsWithUser={allSessionsWithUser}
              distinctIps={distinctIps}
              distinctColos={distinctColos}
              distinctGpus={distinctGpus}
              copiedIp={copiedIp}
              onCopyIp={handleCopyIp}
            />
          )}

          {activeGovernanceTab === 'question-bank' && (
            <div className="py-2">
              <QuestionBankGovernancePanel />
            </div>
          )}

          {activeGovernanceTab === 'accuracy-audit' && (
            <div className="py-2">
              <AdminAccuracyAuditCenter />
            </div>
          )}

          {activeGovernanceTab === 'ai-question-parser' && (
            <div className="py-2">
              <AdminAiQuestionParserLab />
            </div>
          )}

          {activeGovernanceTab === 'cohort-analytics' && (
            <AdminCohortAnalyticsTab
              analytics={analytics}
              allSessionsWithUser={allSessionsWithUser}
              distinctIps={distinctIps}
              copiedIp={copiedIp}
              onCopyIp={handleCopyIp}
              onSetGovernanceTab={setGovernanceTab}
              onSetRestrictionFilter={setRestrictionFilter}
              onQuarantineAnomalousAccounts={() => void quarantineAnomalousAccounts()}
            />
          )}

          {activeGovernanceTab === 'user-directory' && (
            <AdminUserDirectoryTab
              managedUsers={managedUsers}
              filteredUsers={filteredUsers}
              selectedRecord={selectedRecord}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              restrictionFilter={restrictionFilter}
              onRestrictionFilterChange={setRestrictionFilter}
              aiFeatureFilter={aiFeatureFilter}
              onAiFeatureFilterChange={setAiFeatureFilter}
              onSelectManagedUser={selectManagedUser}
              onUpdateUserRole={updateUserRole}
              onSetUserRestriction={setUserRestriction}
              copiedIp={copiedIp}
              onCopyIp={handleCopyIp}
              performanceOverride={performanceOverride}
              onSetPerformanceOverride={setPerformanceOverride}
              fallbackHardwareProfile={authState.clientProfile}
            />
          )}

          {activeGovernanceTab === 'audit-trail' && (
            <AdminSecurityAuditTrailTab auditLogs={auditLogs} />
          )}
        </div>
      </div>
    </div>
  );
};
