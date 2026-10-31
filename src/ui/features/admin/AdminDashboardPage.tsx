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
  Download,
  Zap,
  Copy,
  Check,
  Server,
  Eye,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { QuestionBankGovernancePanel } from './QuestionBankGovernancePanel.tsx';
import { AdminExportBankModal } from './AdminExportBankModal.tsx';
import { AdminAccuracyAuditCenter } from './accuracyAudit/AdminAccuracyAuditCenter.tsx';
import { useAuthStore, type GovernanceViewTab } from '../../../application/stores/useAuthStore.ts';
import type { UserRole, FeatureFlagKey } from '../../../domain/auth/types.ts';
import {
  computePlatformAnalytics,
  filterManagedUsers,
  type AiFeatureFilterMode,
  type RestrictionFilterMode,
} from '../../../domain/auth/governanceAnalytics.ts';

function getCountryFlag(code?: string | null): string {
  if (!code || code === 'DEV') return '🌐';
  const c = code.toUpperCase();
  if (c.length !== 2) return '🌐';
  const codePoints = [...c].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

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
    elevateToPlatformOwner,
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
  const [isElevating, setIsElevating] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Network Telemetry & IP Explorer States
  const [networkSearchQuery, setNetworkSearchQuery] = useState('');
  const [networkFilter, setNetworkFilter] = useState<'all' | 'flagship' | 'cai' | 'global' | 'anomaly'>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [inspectingSessionId, setInspectingSessionId] = useState<string | null>(null);

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

  const filteredSessions = useMemo(() => {
    return allSessionsWithUser.filter((item) => {
      if (networkFilter === 'flagship' && item.device.marketTier !== 'flagship-luxury') {
        return false;
      }
      if (networkFilter === 'cai' && item.edgeNetwork.colo !== 'CAI') {
        return false;
      }
      if (networkFilter === 'global' && item.edgeNetwork.colo === 'CAI') {
        return false;
      }
      if (networkFilter === 'anomaly' && item.anomalyFlags.length === 0 && (item.edgeNetwork.threatScore ?? 0) === 0) {
        return false;
      }

      if (!networkSearchQuery.trim()) return true;
      const q = networkSearchQuery.toLowerCase();
      return (
        item.edgeNetwork.ipAddress?.toLowerCase().includes(q) ||
        item.user.displayName.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q) ||
        item.edgeNetwork.city?.toLowerCase().includes(q) ||
        item.edgeNetwork.countryName?.toLowerCase().includes(q) ||
        item.edgeNetwork.colo?.toLowerCase().includes(q) ||
        item.edgeNetwork.ispOrganization?.toLowerCase().includes(q) ||
        item.device.deviceName?.toLowerCase().includes(q) ||
        item.device.gpuRenderer?.toLowerCase().includes(q) ||
        item.device.osName.toLowerCase().includes(q)
      );
    });
  }, [allSessionsWithUser, networkFilter, networkSearchQuery]);

  const inspectingSession = useMemo(
    () => allSessionsWithUser.find((s) => s.sessionId === inspectingSessionId) ?? null,
    [allSessionsWithUser, inspectingSessionId]
  );

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
                onClick={() => void handleElevatePlatformOwner()}
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
                One-tap elevation: unlocks full Edge Telemetry, IP Forensics & Governance privileges as <strong>Mostafa Yaser</strong>.
              </p>

              <button
                type="button"
                onClick={() => void handleAdminSignIn()}
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
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Registered Google Account</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
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
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">Strict Verification</span>
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
              onClick={() => void handleElevatePlatformOwner()}
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
              One-tap elevation: unlocks full Edge Telemetry, IP Forensics & Governance privileges as <strong>Mostafa Yaser</strong>.
            </p>

            <button
              type="button"
              onClick={() => void handleAdminSignIn()}
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

      {/* ========================================================= */}
      {/* TAB 0: LIVE EDGE NETWORK, IPS & SECURITY FORENSICS         */}
      {/* ========================================================= */}
      {activeGovernanceTab === 'network-telemetry' && (
        <div className="space-y-6 animate-fade-in">
          {/* Executive Ribbon: 4 KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                <span>Public Edge IPs</span>
                <Globe className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
                  {distinctIps.length}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">Active Nodes</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-400">100% Verified Anycast</p>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                <span>Edge Airport Colos</span>
                <Server className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
                  {distinctColos.length}
                </span>
                <span className="text-[10px] font-semibold text-amber-500">Global PoPs</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-400">{distinctColos.join(' • ')}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                <span>Silicon & GPUs</span>
                <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-indigo-600 dark:text-indigo-400">
                  {distinctGpus.length}
                </span>
                <span className="text-[10px] font-semibold text-indigo-500">Archs</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-400">Apple Silicon / Adreno</p>
            </div>

            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                <span>Zero-Trust Security</span>
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                  HTTP/3
                </span>
                <span className="text-[10px] font-semibold text-emerald-500">TLSv1.3</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-400">JA4 Cryptographic Signatures</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={networkSearchQuery}
                onChange={(e) => setNetworkSearchQuery(e.target.value)}
                placeholder="Search by IP (e.g. 156.208), scholar name, city, colo, ASN, or GPU..."
                className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50 pl-9 pr-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-100"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all' as const, label: `All Nodes (${allSessionsWithUser.length})` },
                { id: 'flagship' as const, label: 'Flagship Silicon ($1,200+)' },
                { id: 'cai' as const, label: 'Cairo Edge (CAI)' },
                { id: 'global' as const, label: 'Global PoPs (US/EU/JP)' },
                { id: 'anomaly' as const, label: 'Security Anomalies' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setNetworkFilter(pill.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    networkFilter === pill.id
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Master Edge Network & IP Forensics Table */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold font-heading text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span>Authoritative Edge IP & Telemetry Directory</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Showing {filteredSessions.length} active device sessions mapped across Cloudflare Anycast edge nodes
                </p>
              </div>

              {copiedIp && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-fade-in">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>IP Copied: {copiedIp}</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-850/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-200/80 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Scholar & Account</th>
                    <th className="py-3 px-4">Connecting IP & Location</th>
                    <th className="py-3 px-4">Cloudflare Edge & ASN</th>
                    <th className="py-3 px-4">Security & Crypto</th>
                    <th className="py-3 px-4">Hardware Silicon & UX</th>
                    <th className="py-3 px-4">Cognitive Study Metrics</th>
                    <th className="py-3 px-4 text-right">Forensic Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {filteredSessions.map((session) => {
                    const isCopied = copiedIp === session.edgeNetwork.ipAddress;
                    const isFlagship = session.device.marketTier === 'flagship-luxury';
                    const hasAnomalies = session.anomalyFlags.length > 0 || (session.edgeNetwork.threatScore ?? 0) > 0;

                    return (
                      <tr
                        key={session.sessionId}
                        className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-850/50 transition-colors ${
                          hasAnomalies ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                        }`}
                      >
                        {/* 1. Scholar & Account */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {session.user.avatarUrl ? (
                              <img
                                src={session.user.avatarUrl}
                                alt={session.user.displayName}
                                className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                                {session.user.displayName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <span>{session.user.displayName}</span>
                                {session.isCurrentDevice && (
                                  <span className="rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                                {session.user.email}
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                                Yr {session.user.academicYear} • {session.user.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Connecting IP & Location */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                                {session.edgeNetwork.ipAddress}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyIp(session.edgeNetwork.ipAddress)}
                                title="Copy IP to clipboard"
                                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 cursor-pointer transition-colors"
                              >
                                {isCopied ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                              <span>{getCountryFlag(session.edgeNetwork.countryCode)}</span>
                              <span className="font-medium">
                                {session.edgeNetwork.city || 'Edge Node'}, {session.edgeNetwork.countryName}
                              </span>
                            </div>
                            {session.edgeNetwork.latitude && session.edgeNetwork.longitude && (
                              <div className="text-[10px] font-mono text-zinc-400">
                                {session.edgeNetwork.latitude.toFixed(2)}°N, {session.edgeNetwork.longitude.toFixed(2)}°E
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Cloudflare Edge & ASN */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                                {session.edgeNetwork.colo}
                              </span>
                              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                {session.edgeNetwork.colo === 'CAI'
                                  ? 'Cairo Anycast'
                                  : session.edgeNetwork.colo === 'BOS'
                                  ? 'Boston Anycast'
                                  : session.edgeNetwork.colo === 'SFO'
                                  ? 'San Francisco'
                                  : session.edgeNetwork.colo === 'LHR'
                                  ? 'London Heathrow'
                                  : session.edgeNetwork.colo === 'NRT'
                                  ? 'Tokyo Narita'
                                  : session.edgeNetwork.colo === 'FRA'
                                  ? 'Frankfurt'
                                  : 'Global Node'}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[160px]">
                              {session.edgeNetwork.asn ? `AS${session.edgeNetwork.asn}` : ''}{' '}
                              {session.edgeNetwork.ispOrganization || 'Edge Backbone'}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Latency: ~{session.edgeVerificationLatencyMs.toFixed(1)}ms
                            </div>
                          </div>
                        </td>

                        {/* 4. Security & Crypto */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                                {session.edgeNetwork.httpProtocol}
                              </span>
                              <span className="rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-bold">
                                {session.edgeNetwork.tlsVersion}
                              </span>
                            </div>
                            {session.edgeNetwork.ja4Fingerprint && (
                              <div
                                title={session.edgeNetwork.ja4Fingerprint}
                                className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[130px]"
                              >
                                JA4: {session.edgeNetwork.ja4Fingerprint.slice(0, 12)}...
                              </div>
                            )}
                            <div>
                              {session.edgeNetwork.threatScore && session.edgeNetwork.threatScore > 0 ? (
                                <span className="rounded-full bg-red-500/20 border border-red-500/40 text-red-700 dark:text-red-300 px-2 py-0.2 text-[9px] font-bold">
                                  Threat: {session.edgeNetwork.threatScore}/100
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.2 text-[9px] font-bold">
                                  Threat: 0 Clean
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 5. Hardware Silicon & UX */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                              {session.device.deviceCategory === 'mobile' ? (
                                <Smartphone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Laptop className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span className="truncate max-w-[150px]">{session.device.deviceName}</span>
                            </div>
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[160px]">
                              GPU: {session.device.gpuRenderer || 'Compositor Accelerate'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {session.hardwareProfile?.logicalCpuCores || 8} Cores •{' '}
                              {session.hardwareProfile?.deviceMemoryGb || 8}GB RAM •{' '}
                              <span className={isFlagship ? 'text-amber-600 font-bold' : ''}>
                                {isFlagship ? 'Luxury ($1,200+)' : 'Mid-Range'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Cognitive Study Metrics */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {session.userRecord.studyTelemetry.totalAttempts} Qs
                              </span>
                              <span className="rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 text-[10px] font-bold">
                                {session.userRecord.studyTelemetry.overallAccuracy}% Acc
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              Mastery: <strong>{session.userRecord.studyTelemetry.masteryPercentage}%</strong> •{' '}
                              Pace: <strong>{session.userRecord.studyTelemetry.avgPaceSeconds || 45}s/Q</strong>
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              AI: {session.userRecord.studyTelemetry.dailyAiRequestsUsed}/{session.userRecord.dailyAiRequestsLimit} used
                            </div>
                          </div>
                        </td>

                        {/* 7. Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectingSessionId(session.sessionId)}
                            className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 font-bold text-xs text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer apple-tap"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Forensics</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deep Forensic Slide-over Modal */}
          {inspectingSession && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="glass-surface relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5 animate-scale-in">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold font-heading text-zinc-900 dark:text-zinc-100">
                        Edge Network & Forensic Profile
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {inspectingSession.user.displayName} • {inspectingSession.device.deviceName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingSessionId(null)}
                    className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Section 1: Edge & IP Network */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    1. Cloudflare Anycast & Geolocation Forensics
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Public IP Address</span>
                      <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {inspectingSession.edgeNetwork.ipAddress}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Edge Colocation</span>
                      <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                        {inspectingSession.edgeNetwork.colo} ({inspectingSession.edgeNetwork.countryCode})
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">ISP Organization</span>
                      <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                        {inspectingSession.edgeNetwork.ispOrganization || 'Edge Backbone'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Autonomous System</span>
                      <div className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
                        AS{inspectingSession.edgeNetwork.asn || 'Cloudflare'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Coordinates</span>
                      <div className="font-mono text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {inspectingSession.edgeNetwork.latitude?.toFixed(4)}, {inspectingSession.edgeNetwork.longitude?.toFixed(4)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Edge Timezone</span>
                      <div className="font-mono text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {inspectingSession.edgeNetwork.edgeTimezone || 'UTC'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Security & JA4 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    2. Cryptographic Handshake & Fingerprinting
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">HTTP Protocol</span>
                      <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {inspectingSession.edgeNetwork.httpProtocol}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">TLS Encryption</span>
                      <div className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        {inspectingSession.edgeNetwork.tlsVersion}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Threat Score</span>
                      <div className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {inspectingSession.edgeNetwork.threatScore ?? 0} / 100
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Edge Latency</span>
                      <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                        ~{inspectingSession.edgeVerificationLatencyMs.toFixed(1)}ms
                      </div>
                    </div>
                  </div>
                  {inspectingSession.edgeNetwork.ja4Fingerprint && (
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">JA4 Client Fingerprint</span>
                      <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 break-all select-all mt-0.5">
                        {inspectingSession.edgeNetwork.ja4Fingerprint}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Hardware & GPU Sensors */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    3. Hardware Silicon & GPU Capabilities
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">GPU Architecture</span>
                      <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                        {inspectingSession.device.gpuRenderer || 'Unmasked WebGL'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">CPU & Memory</span>
                      <div className="font-mono text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {inspectingSession.hardwareProfile?.logicalCpuCores || 8} Cores • {inspectingSession.hardwareProfile?.deviceMemoryGb || 8}GB RAM
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-400">Display Resolution</span>
                      <div className="font-mono text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {inspectingSession.hardwareProfile?.screenResolution.width}x{inspectingSession.hardwareProfile?.screenResolution.height} @ {inspectingSession.hardwareProfile?.devicePixelRatio}x
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Full Raw Telemetry JSON Export */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      4. Raw Edge Telemetry Payload (Cloudflare KV Synchronized)
                    </h4>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(JSON.stringify(inspectingSession, null, 2))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy Full JSON</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-2xl bg-zinc-950 text-zinc-300 font-mono text-[10px] max-h-48 overflow-y-auto border border-zinc-800">
                    {JSON.stringify(
                      {
                        edgeNetwork: inspectingSession.edgeNetwork,
                        device: inspectingSession.device,
                        hardwareProfile: inspectingSession.hardwareProfile,
                        studyTelemetry: inspectingSession.userRecord.studyTelemetry,
                        anomalyFlags: inspectingSession.anomalyFlags,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: QUESTION BANK & REVIEW QUEUE */}
      {activeGovernanceTab === 'question-bank' && <QuestionBankGovernancePanel />}

      {/* TAB: ACCURACY AUDIT LAB */}
      {activeGovernanceTab === 'accuracy-audit' && <AdminAccuracyAuditCenter />}

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
                <span>Hardware Compositor & Market Tier Intelligence</span>
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
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Device Economic & Luxury Market Segment
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Flagship / Luxury</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                      {analytics.marketTierBreakdown['flagship-luxury']}
                    </span>
                  </div>
                  <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">Upper Mid-Range</span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      {analytics.marketTierBreakdown['upper-midrange']}
                    </span>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">Mid-Range</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                      {analytics.marketTierBreakdown['mid-range']}
                    </span>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Economical</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {analytics.marketTierBreakdown.economical}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Geographic Edge IP & Colocation Distribution */}
          <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <Globe className="h-4 w-4 text-emerald-500" />
                <span>Active Edge IP & Geographic Node Distribution</span>
              </div>
              <button
                type="button"
                onClick={() => setGovernanceTab('network-telemetry')}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All {distinctIps.length} Connecting Public IPs in Forensics</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allSessionsWithUser.map((sess) => (
                <div
                  key={sess.sessionId}
                  className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/60 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{sess.edgeNetwork.ipAddress}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyIp(sess.edgeNetwork.ipAddress)}
                        className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        title="Copy IP"
                      >
                        {copiedIp === sess.edgeNetwork.ipAddress ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </span>
                    <span className="rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 font-mono text-[10px] font-bold">
                      {sess.edgeNetwork.colo}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                    <span>{getCountryFlag(sess.edgeNetwork.countryCode)}</span>
                    <span className="truncate">{sess.edgeNetwork.city || 'Edge Node'}, {sess.edgeNetwork.countryName}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {sess.user.displayName} • {sess.device.deviceName}
                  </div>
                </div>
              ))}
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
                <option value="student-free">Free Scholars</option>
                <option value="student-pro">Pro Scholars</option>
                <option value="faculty-reviewer">Faculty Reviewers</option>
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

                {/* Live Scholar Study & Cognitive Telemetry Inspector */}
                {selectedRecord?.studyTelemetry && (
                  <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-zinc-400">
                        Live Scholar Study & Cognitive Telemetry
                      </h4>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        Focus: {selectedRecord.studyTelemetry.favoriteSubspecialty}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 p-2.5">
                        <span className="text-[10px] uppercase text-zinc-400">Attempts</span>
                        <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">
                          {selectedRecord.studyTelemetry.totalAttempts}
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 p-2.5">
                        <span className="text-[10px] uppercase text-zinc-400">Accuracy</span>
                        <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                          {selectedRecord.studyTelemetry.overallAccuracy}%
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 p-2.5">
                        <span className="text-[10px] uppercase text-zinc-400">Mastery</span>
                        <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {selectedRecord.studyTelemetry.masteryPercentage}%
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 p-2.5">
                        <span className="text-[10px] uppercase text-zinc-400">Avg Pace</span>
                        <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {selectedRecord.studyTelemetry.avgPaceSeconds
                            ? `${selectedRecord.studyTelemetry.avgPaceSeconds}s/Q`
                            : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 p-2.5">
                        <span className="text-[10px] uppercase text-zinc-400">Weak / Due</span>
                        <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                          {selectedRecord.studyTelemetry.weakTopicsCount}W / {selectedRecord.studyTelemetry.dueReviewsCount}D
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 p-2.5">
                        <span className="text-[10px] uppercase text-zinc-400">Cloud AI</span>
                        <div className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 mt-0.5">
                          {selectedRecord.studyTelemetry.dailyAiRequestsUsed}/{selectedRecord.dailyAiRequestsLimit}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Role Assignment Selector */}
                <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <h4 className="text-xs font-bold uppercase text-zinc-400">Assigned Role Tier</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['student-free', 'student-pro', 'faculty-reviewer', 'admin'] as UserRole[]).map((roleOption) => {
                      const active = targetUser.role === roleOption;
                      return (
                        <button
                          key={roleOption}
                          type="button"
                          onClick={() => void updateUserRole(targetUser.id, roleOption)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase transition-all cursor-pointer ${
                            active
                              ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                              : 'border-zinc-200/70 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-400'
                          }`}
                        >
                          {roleOption}
                        </button>
                      );
                    })}
                  </div>
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
                            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                              <span>{getCountryFlag(sess.edgeNetwork.countryCode)}</span>
                              <span>Edge: {sess.edgeNetwork.colo} ({sess.edgeNetwork.city || sess.edgeNetwork.countryCode})</span>
                              <span>•</span>
                              <span>{sess.edgeNetwork.ipAddress}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyIp(sess.edgeNetwork.ipAddress)}
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer ml-0.5"
                                title="Copy IP"
                              >
                                {copiedIp === sess.edgeNetwork.ipAddress ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
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
