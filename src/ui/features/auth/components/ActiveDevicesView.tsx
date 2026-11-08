import React from 'react';
import { Laptop, Smartphone, Cpu, Trash2 } from 'lucide-react';
import type { AuthState, ActiveDeviceSession } from '../../../../domain/auth/types.ts';

interface ActiveDevicesViewProps {
  authState: AuthState;
  onRevokeDevice: (sessionId: string) => void;
}

export const ActiveDevicesView: React.FC<ActiveDevicesViewProps> = ({
  authState,
  onRevokeDevice,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Current Session, Hardware Profile & Cloudflare Edge Routing
        </h4>
        {authState.status === 'authenticated-active' ? (
          <div className="mt-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {authState.currentSession.device.deviceName ||
                    `${authState.currentSession.device.osName} • ${authState.currentSession.device.browserName}`}
                </span>
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Current Device
                </span>
                {authState.currentSession.device.marketTierLabel && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      authState.currentSession.device.marketTier === 'flagship-luxury'
                        ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-300'
                        : authState.currentSession.device.marketTier === 'upper-midrange'
                        ? 'bg-indigo-500/15 text-indigo-700 border border-indigo-500/30 dark:text-indigo-300'
                        : authState.currentSession.device.marketTier === 'economical'
                        ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300'
                        : 'bg-blue-500/15 text-blue-700 border border-blue-500/30 dark:text-blue-300'
                    }`}
                  >
                    {authState.currentSession.device.marketTierLabel}
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                KV Cache: {authState.currentSession.edgeVerificationLatencyMs}ms
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>
                {authState.currentSession.device.osName}
                {authState.currentSession.device.osVersion
                  ? ` ${authState.currentSession.device.osVersion}`
                  : ''}{' '}
                • {authState.currentSession.device.browserName}
                {authState.currentSession.device.browserVersion
                  ? ` ${authState.currentSession.device.browserVersion}`
                  : ''}
              </span>
              {authState.currentSession.device.deviceModelCode && (
                <span className="rounded bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                  Model: {authState.currentSession.device.deviceModelCode}
                </span>
              )}
              {authState.currentSession.device.estimatedPriceSegment && (
                <span className="rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-semibold">
                  {authState.currentSession.device.estimatedPriceSegment}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                <span className="text-[10px] text-zinc-400">Edge Colo</span>
                <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                  {authState.currentSession.edgeNetwork.colo} ({authState.currentSession.edgeNetwork.city || authState.currentSession.edgeNetwork.countryCode})
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                <span className="text-[10px] text-zinc-400">Connecting IP</span>
                <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                  {authState.currentSession.edgeNetwork.ipAddress}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                <span className="text-[10px] text-zinc-400">CPU & RAM</span>
                <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {authState.clientProfile.logicalCpuCores} Cores •{' '}
                  {authState.clientProfile.deviceMemoryGb
                    ? `${authState.clientProfile.deviceMemoryGb}GB RAM`
                    : 'Unified Memory'}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200/60 bg-white/60 p-2 dark:border-zinc-800/60 dark:bg-zinc-800/40">
                <span className="text-[10px] text-zinc-400">Silicon / GPU</span>
                <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 truncate" title={authState.currentSession.device.gpuRenderer || 'GPU'}>
                  {authState.currentSession.device.gpuRenderer ||
                    `${authState.currentSession.edgeNetwork.httpProtocol} • ${authState.currentSession.edgeNetwork.tlsVersion}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            Guest session previewing edge data: {authState.status === 'anonymous-guest' ? authState.edgePreview.colo : 'N/A'}
          </div>
        )}
      </div>

      {/* Active Devices List */}
      {authState.status === 'authenticated-active' && (
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              All Linked User Devices ({authState.activeSessions.length})
            </h4>
          </div>

          <div className="mt-2.5 space-y-2.5">
            {authState.activeSessions.map((session: ActiveDeviceSession) => {
              const isDesktop = session.device.deviceCategory === 'desktop';
              const tierBadgeColor =
                session.device.marketTier === 'flagship-luxury'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : session.device.marketTier === 'upper-midrange'
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                  : session.device.marketTier === 'economical'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';

              return (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/60 bg-white/40 p-3 text-xs dark:border-zinc-800/60 dark:bg-zinc-800/40"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {isDesktop ? (
                        <Laptop className="h-4 w-4" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {session.device.deviceName ||
                            `${session.device.osName} • ${session.device.browserName}`}
                        </p>
                        {session.isCurrentDevice && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                            This Device
                          </span>
                        )}
                        {session.device.marketTierLabel && (
                          <span
                            className={`rounded-full border px-2 py-0.2 text-[9px] font-bold uppercase ${tierBadgeColor}`}
                          >
                            {session.device.marketTierLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {session.device.osName}
                        {session.device.osVersion ? ` ${session.device.osVersion}` : ''} •{' '}
                        {session.device.browserName}
                        {session.device.deviceModelCode
                          ? ` (${session.device.deviceModelCode})`
                          : ''}{' '}
                        • {session.edgeNetwork.city || session.edgeNetwork.countryCode} (Colo:{' '}
                        {session.edgeNetwork.colo})
                      </p>
                      {(session.device.gpuRenderer || session.hardwareProfile) && (
                        <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 truncate">
                          <Cpu className="h-3 w-3 shrink-0 text-indigo-500" />
                          <span>
                            {session.hardwareProfile?.logicalCpuCores ?? 4} Cores
                            {session.hardwareProfile?.deviceMemoryGb
                              ? ` • ${session.hardwareProfile.deviceMemoryGb}GB RAM`
                              : ''}
                            {session.device.gpuRenderer
                              ? ` • ${session.device.gpuRenderer}`
                              : ''}
                            {session.device.estimatedPriceSegment
                              ? ` • ${session.device.estimatedPriceSegment}`
                              : ''}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {!session.isCurrentDevice && (
                    <button
                      type="button"
                      onClick={() => void onRevokeDevice(session.sessionId)}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
