import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  CheckCircle,
  Laptop,
  Smartphone,
  Check,
  Copy,
  Ban,
  Unlock,
  AlertTriangle,
  Lock,
  Cpu,
} from 'lucide-react';
import { ROLE_ENTITLEMENT_POLICIES } from '../../../../domain/auth/entitlements.ts';
import type {
  ClientHardwareProfile,
  FeatureFlagKey,
  ManagedUserRecord,
  PerformanceOverrideMode,
  UserRole,
} from '../../../../domain/auth/types.ts';
import type {
  AiFeatureFilterMode,
  RestrictionFilterMode,
} from '../../../../domain/auth/governanceAnalytics.ts';
import { FEATURE_FLAG_META, getCountryFlag } from './governanceConstantsAndHelpers.ts';

export interface AdminUserDirectoryTabProps {
  readonly managedUsers: ReadonlyArray<ManagedUserRecord>;
  readonly filteredUsers: ReadonlyArray<ManagedUserRecord>;
  readonly selectedRecord?: ManagedUserRecord;
  readonly searchQuery: string;
  readonly onSearchQueryChange: (query: string) => void;
  readonly roleFilter: UserRole | 'all';
  readonly onRoleFilterChange: (role: UserRole | 'all') => void;
  readonly restrictionFilter: RestrictionFilterMode;
  readonly onRestrictionFilterChange: (filter: RestrictionFilterMode) => void;
  readonly aiFeatureFilter: AiFeatureFilterMode;
  readonly onAiFeatureFilterChange: (filter: AiFeatureFilterMode) => void;
  readonly onSelectManagedUser: (userId: string) => void;
  readonly onUpdateUserRole: (
    userId: string,
    role: UserRole,
    customFeatureOverrides?: Partial<Record<FeatureFlagKey, boolean>>
  ) => Promise<void>;
  readonly onSetUserRestriction: (
    userId: string,
    status: 'active' | 'blocked' | 'suspended',
    reason: string | null,
    suspendedUntilIso?: string | null
  ) => Promise<void>;
  readonly copiedIp: string | null;
  readonly onCopyIp: (ip: string) => void;
  readonly performanceOverride?: PerformanceOverrideMode;
  readonly onSetPerformanceOverride?: (mode: PerformanceOverrideMode) => void;
  readonly fallbackHardwareProfile?: ClientHardwareProfile;
}

export const AdminUserDirectoryTab: React.FC<AdminUserDirectoryTabProps> = ({
  managedUsers,
  filteredUsers,
  selectedRecord,
  searchQuery,
  onSearchQueryChange,
  roleFilter,
  onRoleFilterChange,
  restrictionFilter,
  onRestrictionFilterChange,
  aiFeatureFilter,
  onAiFeatureFilterChange,
  onSelectManagedUser,
  onUpdateUserRole,
  onSetUserRestriction,
  copiedIp,
  onCopyIp,
  performanceOverride,
  onSetPerformanceOverride,
  fallbackHardwareProfile,
}) => {
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);

  const targetUser = selectedRecord?.profile;
  const targetEntitlements = selectedRecord?.entitlements;
  const isTargetBlocked = targetUser?.restriction.status === 'blocked';
  const isTargetSuspended = targetUser?.restriction.status === 'suspended';

  const handleToggleFeature = async (flag: FeatureFlagKey) => {
    if (!targetUser || !targetEntitlements) return;
    const currentVal = Boolean(targetEntitlements[flag]);
    await onUpdateUserRole(targetUser.id, targetUser.role, { [flag]: !currentVal });
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

    await onSetUserRestriction(
      targetUser.id,
      status,
      blockReasonInput.trim() || defaultReason,
      untilIso
    );
    setBlockReasonInput('');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* User Directory List */}
      <div className="space-y-3 lg:col-span-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
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
              onClick={() => onAiFeatureFilterChange(pill.mode)}
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
            onChange={(e) => onRoleFilterChange(e.target.value as UserRole | 'all')}
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
            onChange={(e) => onRestrictionFilterChange(e.target.value as RestrictionFilterMode)}
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
            const isRestricted = u.restriction.status !== 'active';
            const hasAnomaly = record.activeSessions.some((s) => s.anomalyFlags.length > 0);
            const isAiAllowed = Boolean(record.entitlements.ai_cloud_streaming_quota);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectManagedUser(u.id)}
                className={`w-full rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500/80 bg-amber-500/10 shadow-sm dark:bg-amber-500/15'
                    : 'border-zinc-200/70 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {u.displayName}
                    </span>
                    {isRestricted && (
                      <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700 dark:text-red-300">
                        {u.restriction.status}
                      </span>
                    )}
                    {hasAnomaly && !isRestricted && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300">
                        Anomaly
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 font-mono shrink-0">
                    {u.role}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {u.email}
                  {u.phoneNumber ? ` • 📞 ${u.phoneNumber}` : ''}
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>
                    {record.activeSessions.length} device
                    {record.activeSessions.length === 1 ? '' : 's'} •{' '}
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
      {targetUser && selectedRecord && (
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
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  targetUser.restriction.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-500/20 text-red-700 dark:text-red-300'
                }`}
              >
                {targetUser.restriction.status}
              </span>
            </div>

            {/* Live Scholar Study & Cognitive Telemetry Inspector */}
            {selectedRecord.studyTelemetry && (
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
                      {selectedRecord.studyTelemetry.weakTopicsCount}W /{' '}
                      {selectedRecord.studyTelemetry.dueReviewsCount}D
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800 p-2.5">
                    <span className="text-[10px] uppercase text-zinc-400">Cloud AI</span>
                    <div className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 mt-0.5">
                      {selectedRecord.studyTelemetry.dailyAiRequestsUsed}/
                      {selectedRecord.dailyAiRequestsLimit}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Assignment Selector */}
            <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <h4 className="text-xs font-bold uppercase text-zinc-400">Assigned Role Tier</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['student-free', 'student-pro', 'faculty-reviewer', 'admin'] as UserRole[]).map(
                  (roleOption) => {
                    const pol = ROLE_ENTITLEMENT_POLICIES[roleOption];
                    const active = targetUser.role === roleOption;
                    return (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => void onUpdateUserRole(targetUser.id, roleOption)}
                        className={`rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                          active
                            ? 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : 'border-zinc-200/70 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-850 dark:text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase">{roleOption}</span>
                          {active && (
                            <CheckCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          Max {pol.maxConcurrentDevices} dev • {pol.dailyCloudAiRequestsLimit} AI/d
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Linked Devices & Economic / Luxury Market Tier Intelligence */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-zinc-400">
                  Linked Devices & Hardware Market Tier ({selectedRecord.activeSessions.length})
                </h4>
                <span className="text-[10px] font-mono text-indigo-500">
                  Synced with Cloudflare D1
                </span>
              </div>

              {selectedRecord.activeSessions.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecord.activeSessions.map((session, idx) => (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => setSelectedSessionIdx(idx)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        selectedSessionIdx === idx
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {session.device.deviceCategory === 'desktop' ? (
                        <Laptop className="h-3.5 w-3.5" />
                      ) : (
                        <Smartphone className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {session.device.deviceName ||
                          `${session.device.osName} • ${session.device.browserName}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {selectedRecord.activeSessions.map((sess) => {
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
                            {sess.device.deviceName ||
                              `${sess.device.osName} • ${sess.device.browserName}`}
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
                          Browser:{' '}
                          <strong>
                            {sess.device.browserName} {sess.device.browserVersion || ''}
                          </strong>
                        </span>
                        {sess.device.gpuRenderer && (
                          <span>
                            GPU: <strong>{sess.device.gpuRenderer}</strong>
                          </span>
                        )}
                        {sess.hardwareProfile && (
                          <span>
                            Hardware:{' '}
                            <strong>
                              {sess.hardwareProfile.logicalCpuCores} Cores
                              {sess.hardwareProfile.deviceMemoryGb
                                ? ` / ${sess.hardwareProfile.deviceMemoryGb}GB RAM`
                                : ''}
                            </strong>
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                          <span>{getCountryFlag(sess.edgeNetwork.countryCode)}</span>
                          <span>
                            Edge: {sess.edgeNetwork.colo} (
                            {sess.edgeNetwork.city || sess.edgeNetwork.countryCode})
                          </span>
                          <span>•</span>
                          <span>{sess.edgeNetwork.ipAddress}</span>
                          <button
                            type="button"
                            onClick={() => onCopyIp(sess.edgeNetwork.ipAddress)}
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
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-zinc-400">
                  Feature Access & AI Quotas
                </h4>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Overrides Role Defaults Instantly
                </span>
              </div>
              {FEATURE_FLAG_META.map((item) => {
                const enabled = Boolean(targetEntitlements?.[item.key]);
                const isOverridden = item.key in (targetUser.customFeatureOverrides ?? {});
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                          {item.title}
                        </span>
                        {isOverridden && (
                          <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-300">
                            Custom Override
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">{item.description}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`Toggle ${item.title} for ${targetUser.displayName}`}
                      onClick={() => void handleToggleFeature(item.key)}
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                        enabled ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
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
              {targetUser.restriction.status !== 'active' && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-900 dark:text-red-200">
                  <strong>
                    Current Restriction ({targetUser.restriction.status.toUpperCase()}):
                  </strong>{' '}
                  {targetUser.restriction.blockedReason || 'Administrative hold'}
                </div>
              )}
              <input
                type="text"
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                placeholder="Enforcement reason (e.g. Terms violation)"
                className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="flex flex-wrap gap-2">
                {(isTargetBlocked || isTargetSuspended) && (
                  <button
                    type="button"
                    onClick={() => void handleEnforceRestriction('active')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Reactivate Account</span>
                  </button>
                )}
                {!isTargetSuspended && (
                  <button
                    type="button"
                    onClick={() => void handleEnforceRestriction('suspended')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-700 cursor-pointer"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Suspend (24h)</span>
                  </button>
                )}
                {!isTargetBlocked && (
                  <button
                    type="button"
                    onClick={() => void handleEnforceRestriction('blocked')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-red-700 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Permanently Ban</span>
                  </button>
                )}
              </div>
            </div>

            {/* Optional Adaptive Compositor Simulator (used in Drawer & Admin Testing) */}
            {performanceOverride && onSetPerformanceOverride && (
              <div className="border-t border-zinc-200/60 pt-3 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-blue-500" />
                    <span>Adaptive Compositor Simulator (Admin Testing)</span>
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Active: {performanceOverride.toUpperCase()}
                    {fallbackHardwareProfile ? ` (${fallbackHardwareProfile.activeTier})` : ''}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['auto', 'ultra', 'balanced', 'low-spec'] as PerformanceOverrideMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onSetPerformanceOverride(mode)}
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
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
