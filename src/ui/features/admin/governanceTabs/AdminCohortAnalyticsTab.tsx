import React from 'react';
import {
  Globe,
  Cpu,
  ExternalLink,
  Check,
  Copy,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { ROLE_ENTITLEMENT_POLICIES } from '../../../../domain/auth/entitlements.ts';
import type { UserRole } from '../../../../domain/auth/types.ts';
import type {
  PlatformAnalyticsSummary,
  RestrictionFilterMode,
} from '../../../../domain/auth/governanceAnalytics.ts';
import type { GovernanceViewTab } from '../../../../application/stores/useAuthStore.ts';
import { getCountryFlag, type SessionWithUser } from './governanceConstantsAndHelpers.ts';

export interface AdminCohortAnalyticsTabProps {
  readonly analytics: PlatformAnalyticsSummary;
  readonly allSessionsWithUser: ReadonlyArray<SessionWithUser>;
  readonly distinctIps: ReadonlyArray<string>;
  readonly copiedIp: string | null;
  readonly onCopyIp: (ip: string) => void;
  readonly onSetGovernanceTab: (tab: GovernanceViewTab) => void;
  readonly onSetRestrictionFilter?: (filter: RestrictionFilterMode) => void;
  readonly onQuarantineAnomalousAccounts?: () => void;
}

export const AdminCohortAnalyticsTab: React.FC<AdminCohortAnalyticsTabProps> = ({
  analytics,
  allSessionsWithUser,
  distinctIps,
  copiedIp,
  onCopyIp,
  onSetGovernanceTab,
  onSetRestrictionFilter,
  onQuarantineAnomalousAccounts,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-[11px] font-medium text-zinc-500">Total Scholars</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-zinc-900 dark:text-zinc-100">
              {analytics.totalUsers}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600">
              {analytics.activeUsersCount} Active
            </span>
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

      {/* Security Anomaly Radar Banner */}
      {onQuarantineAnomalousAccounts && onSetRestrictionFilter && (
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
              with security flags: Impossible Travel (
              {analytics.anomalyBreakdown.impossible_travel_geo_shift}), Excessive Concurrent
              Devices ({analytics.anomalyBreakdown.excessive_concurrent_devices}), High Threat IP (
              {analytics.anomalyBreakdown.high_threat_ip_score}).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSetRestrictionFilter('anomalous');
                onSetGovernanceTab('user-directory');
              }}
              className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer dark:border-red-800 dark:bg-zinc-900 dark:text-red-300"
            >
              Inspect Flagged Users
            </button>
            <button
              type="button"
              onClick={onQuarantineAnomalousAccounts}
              className="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 cursor-pointer"
            >
              Quarantine Flagged Accounts
            </button>
          </div>
        </div>
      )}

      {/* University Cohort Performance Table */}
      {analytics.universityCohorts.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
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
                  <tr
                    key={cohort.universityName}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                  >
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
      )}

      {/* Colos & Hardware Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <Globe className="h-4 w-4 text-blue-500" />
            <span>Cloudflare Global Edge Traffic (Top Colos)</span>
          </div>
          <div className="space-y-2">
            {analytics.coloDistribution.slice(0, 6).map((colo) => (
              <div key={colo.colo} className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold">
                  {colo.colo} ({colo.city ?? colo.countryCode})
                </span>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>{colo.activeSessionsCount} active sessions</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {colo.avgLatencyMs}ms
                  </span>
                </div>
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
              <span className="font-mono font-bold text-indigo-500">
                {analytics.tierBreakdown.ultra} devices
              </span>
            </div>
            <div className="flex justify-between">
              <span>Balanced Tier (60fps GPU Compositor)</span>
              <span className="font-mono font-bold text-blue-500">
                {analytics.tierBreakdown.balanced} devices
              </span>
            </div>
            <div className="flex justify-between">
              <span>Low-Spec Saver (&lt;16ms Input)</span>
              <span className="font-mono font-bold text-emerald-500">
                {analytics.tierBreakdown['low-spec']} devices
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Device Economic & Luxury Market Segment
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Flagship / Luxury
                </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                  {analytics.marketTierBreakdown['flagship-luxury']}
                </span>
              </div>
              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">
                  Upper Mid-Range
                </span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {analytics.marketTierBreakdown['upper-midrange']}
                </span>
              </div>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                  Mid-Range
                </span>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                  {analytics.marketTierBreakdown['mid-range']}
                </span>
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Economical
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {analytics.marketTierBreakdown.economical}
                </span>
              </div>
            </div>
            <div className="pt-1 flex flex-wrap gap-1.5">
              {(['student-free', 'student-pro', 'faculty-reviewer', 'admin'] as UserRole[]).map(
                (r) => (
                  <span
                    key={r}
                    className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {ROLE_ENTITLEMENT_POLICIES[r].label}: {analytics.roleBreakdown[r]}
                  </span>
                )
              )}
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
            onClick={() => onSetGovernanceTab('network-telemetry')}
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
                    onClick={() => onCopyIp(sess.edgeNetwork.ipAddress)}
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
                <span className="truncate">
                  {sess.edgeNetwork.city || 'Edge Node'}, {sess.edgeNetwork.countryName}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 truncate">
                {sess.user.displayName} • {sess.device.deviceName}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
