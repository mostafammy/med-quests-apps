import React, { useState, useMemo } from 'react';
import {
  Globe,
  Server,
  Cpu,
  Shield,
  Search,
  Check,
  Copy,
  Smartphone,
  Laptop,
  Eye,
  X,
} from 'lucide-react';
import { getCountryFlag, type SessionWithUser } from './governanceConstantsAndHelpers.ts';

export interface AdminNetworkTelemetryTabProps {
  readonly allSessionsWithUser: ReadonlyArray<SessionWithUser>;
  readonly distinctIps: ReadonlyArray<string>;
  readonly distinctColos: ReadonlyArray<string>;
  readonly distinctGpus: ReadonlyArray<string>;
  readonly copiedIp: string | null;
  readonly onCopyIp: (ip: string) => void;
}

export const AdminNetworkTelemetryTab: React.FC<AdminNetworkTelemetryTabProps> = ({
  allSessionsWithUser,
  distinctIps,
  distinctColos,
  distinctGpus,
  copiedIp,
  onCopyIp,
}) => {
  const [networkSearchQuery, setNetworkSearchQuery] = useState('');
  const [networkFilter, setNetworkFilter] = useState<
    'all' | 'flagship' | 'cai' | 'global' | 'anomaly'
  >('all');
  const [inspectingSessionId, setInspectingSessionId] = useState<string | null>(null);

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
      if (
        networkFilter === 'anomaly' &&
        item.anomalyFlags.length === 0 &&
        (item.edgeNetwork.threatScore ?? 0) === 0
      ) {
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

  return (
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
                const hasAnomalies =
                  session.anomalyFlags.length > 0 || (session.edgeNetwork.threatScore ?? 0) > 0;

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
                            onClick={() => onCopyIp(session.edgeNetwork.ipAddress)}
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
                            {session.edgeNetwork.city || 'Edge Node'},{' '}
                            {session.edgeNetwork.countryName}
                          </span>
                        </div>
                        {session.edgeNetwork.latitude && session.edgeNetwork.longitude && (
                          <div className="text-[10px] font-mono text-zinc-400">
                            {session.edgeNetwork.latitude.toFixed(2)}°N,{' '}
                            {session.edgeNetwork.longitude.toFixed(2)}°E
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
                          {session.edgeNetwork.threatScore &&
                          session.edgeNetwork.threatScore > 0 ? (
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
                          <span className="truncate max-w-[150px]">
                            {session.device.deviceName}
                          </span>
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
                          Mastery:{' '}
                          <strong>{session.userRecord.studyTelemetry.masteryPercentage}%</strong> •{' '}
                          Pace:{' '}
                          <strong>
                            {session.userRecord.studyTelemetry.avgPaceSeconds || 45}s/Q
                          </strong>
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          AI: {session.userRecord.studyTelemetry.dailyAiRequestsUsed}/
                          {session.userRecord.dailyAiRequestsLimit} used
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
                    {inspectingSession.edgeNetwork.colo} ({inspectingSession.edgeNetwork.countryCode}
                    )
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
                    {inspectingSession.edgeNetwork.latitude?.toFixed(4)},{' '}
                    {inspectingSession.edgeNetwork.longitude?.toFixed(4)}
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
                    {inspectingSession.hardwareProfile?.logicalCpuCores || 8} Cores •{' '}
                    {inspectingSession.hardwareProfile?.deviceMemoryGb || 8}GB RAM
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-850 p-2.5 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-[10px] uppercase text-zinc-400">Display Resolution</span>
                  <div className="font-mono text-xs text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {inspectingSession.hardwareProfile?.screenResolution.width}x
                    {inspectingSession.hardwareProfile?.screenResolution.height} @{' '}
                    {inspectingSession.hardwareProfile?.devicePixelRatio}x
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
                  onClick={() =>
                    void navigator.clipboard.writeText(JSON.stringify(inspectingSession, null, 2))
                  }
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
  );
};
