import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sliders,
  History,
  Users,
  BarChart3,
  Globe,
  Trash2,
  BookOpen,
  Download,
  Sparkles,
  UploadCloud,
  Activity,
} from 'lucide-react';
import { LiveEdgeObservabilityPortal } from './observability/LiveEdgeObservabilityPortal.tsx';
import { QuestionBankGovernancePanel } from './QuestionBankGovernancePanel.tsx';
import { AdminExportBankModal } from './AdminExportBankModal.tsx';
import { AdminAccuracyAuditCenter } from './accuracyAudit/AdminAccuracyAuditCenter.tsx';
import { AdminAiQuestionParserLab } from './aiQuestionParser/AdminAiQuestionParserLab.tsx';
import { AdminUnauthorizedAccessGate } from './governanceTabs/AdminUnauthorizedAccessGate.tsx';
import { AdminNetworkTelemetryTab } from './governanceTabs/AdminNetworkTelemetryTab.tsx';
import { AdminCohortAnalyticsTab } from './governanceTabs/AdminCohortAnalyticsTab.tsx';
import { AdminUserDirectoryTab } from './governanceTabs/AdminUserDirectoryTab.tsx';
import { AdminSecurityAuditTrailTab } from './governanceTabs/AdminSecurityAuditTrailTab.tsx';
import { useAuthStore, type GovernanceViewTab } from '../../../application/stores/useAuthStore.ts';
import type { UserRole } from '../../../domain/auth/types.ts';
import {
  computePlatformAnalytics,
  filterManagedUsers,
  type AiFeatureFilterMode,
  type RestrictionFilterMode,
} from '../../../domain/auth/governanceAnalytics.ts';

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
    quarantineAnomalousAccounts,
    signInWithGoogle,
    elevateToPlatformOwner,
    purgeDemoData,
    revalidate,
  } = useAuthStore();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    void revalidate();
  }, [revalidate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (
      tab &&
      [
        'cloud-observability',
        'network-telemetry',
        'cohort-analytics',
        'user-directory',
        'audit-trail',
        'question-bank',
        'accuracy-audit',
        'ai-question-parser',
      ].includes(tab)
    ) {
      setGovernanceTab(tab as GovernanceViewTab);
    }
  }, [searchParams, setGovernanceTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [restrictionFilter, setRestrictionFilter] = useState<RestrictionFilterMode>('all');
  const [aiFeatureFilter, setAiFeatureFilter] = useState<AiFeatureFilterMode>('all');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isElevating, setIsElevating] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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

  const handleElevatePlatformOwner = async () => {
    setIsElevating(true);
    try {
      await elevateToPlatformOwner();
    } finally {
      setIsElevating(false);
    }
  };

  const handleAdminSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  const isAdmin = authState.status === 'authenticated-active' && authState.user.role === 'admin';
  const isFaculty =
    authState.status === 'authenticated-active' && authState.user.role === 'faculty-reviewer';
  const isAuthorized = isAdmin || isFaculty;
  const isAuthenticatedNonAdmin = authState.status === 'authenticated-active' && !isAuthorized;

  if (!isAuthorized) {
    return (
      <AdminUnauthorizedAccessGate
        isAuthenticatedNonAdmin={isAuthenticatedNonAdmin}
        currentUser={authState.status === 'authenticated-active' ? authState.user : undefined}
        isElevating={isElevating}
        isSigningIn={isSigningIn}
        onElevatePlatformOwner={() => void handleElevatePlatformOwner()}
        onAdminSignIn={() => void handleAdminSignIn()}
        onReturnHome={() => navigate('/')}
      />
    );
  }

  const selectedRecord =
    managedUsers.find((u) => u.profile.id === selectedManagedUserId) ??
    filteredUsers[0] ??
    managedUsers[0];

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

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              title="Export Authoritative Master Question Bank (Platform Admins Only)"
              className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-xs cursor-pointer transition-colors apple-tap"
            >
              <Download className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Export Master Bank</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/60 pb-3 dark:border-zinc-800/60">
        {[
          ...(isAdmin
            ? [
                {
                  id: 'cloud-observability' as const,
                  label: 'Live Edge & Cohort Observability',
                  icon: Activity,
                  badge: 'Live 100% SLA',
                },
                {
                  id: 'network-telemetry' as const,
                  label: 'Live Edge Network, IPs & Security Forensics',
                  icon: Globe,
                  badge: `${distinctIps.length} Live IPs • ${distinctColos.length} PoPs`,
                },
                {
                  id: 'cohort-analytics' as const,
                  label: 'Global Cohort & Telemetry Stats',
                  icon: BarChart3,
                  badge: `${analytics.totalUsers} Scholars`,
                },
                {
                  id: 'user-directory' as const,
                  label: 'User Directory, AI Toggles & Bans',
                  icon: Users,
                  badge: `${analytics.aiCloudEnabledUsersCount} AI Active`,
                },
              ]
            : []),
          {
            id: 'question-bank' as const,
            label: 'Question Bank & Review Queue',
            icon: BookOpen,
            badge: 'Curriculum Cockpit',
          },
          ...(isAdmin
            ? [
                {
                  id: 'ai-question-parser' as const,
                  label: 'AI Ingestion Lab',
                  icon: UploadCloud,
                  badge: 'Multi-Model',
                },
                {
                  id: 'accuracy-audit' as const,
                  label: 'Accuracy Audit Lab',
                  icon: Sparkles,
                  badge: 'Apple QA Standard',
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

      {/* TAB PREMIER: LIVE CLOUDFLARE EDGE & COHORT OBSERVABILITY */}
      {activeGovernanceTab === 'cloud-observability' && <LiveEdgeObservabilityPortal />}

      {/* TAB 0: LIVE EDGE NETWORK, IPS & SECURITY FORENSICS */}
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

      {/* TAB: QUESTION BANK & REVIEW QUEUE */}
      {activeGovernanceTab === 'question-bank' && <QuestionBankGovernancePanel />}

      {/* TAB: ACCURACY AUDIT LAB */}
      {activeGovernanceTab === 'accuracy-audit' && <AdminAccuracyAuditCenter />}

      {/* TAB: AI QUESTION INGESTION & ANTI-HALLUCINATION LAB */}
      {activeGovernanceTab === 'ai-question-parser' && <AdminAiQuestionParserLab />}

      {/* TAB 1: COHORT ANALYTICS */}
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

      {/* TAB 2: USER DIRECTORY & CONTROLS */}
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
        />
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeGovernanceTab === 'audit-trail' && (
        <AdminSecurityAuditTrailTab auditLogs={auditLogs} />
      )}

      {/* Authoritative Question Bank Export Modal (Admins Only) */}
      {isAdmin && (
        <AdminExportBankModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          blockId="cvs"
        />
      )}
    </div>
  );
};
