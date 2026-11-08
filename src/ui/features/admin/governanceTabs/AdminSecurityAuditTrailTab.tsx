import React from 'react';
import { History } from 'lucide-react';
import type { GovernanceAuditEntry } from '../../../../domain/auth/types.ts';

export interface AdminSecurityAuditTrailTabProps {
  readonly auditLogs: ReadonlyArray<GovernanceAuditEntry>;
}

export const AdminSecurityAuditTrailTab: React.FC<AdminSecurityAuditTrailTabProps> = ({
  auditLogs,
}) => {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          <History className="h-4 w-4 text-amber-500" />
          <span>Immutable Security Audit Ledger</span>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          D1 Table: security_audit_log
        </span>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {auditLogs.map((log) => (
          <div
            key={log.id}
            className="flex flex-col justify-between gap-2 rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-3.5 text-xs sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-850/60"
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
                <span className="text-[11px] text-zinc-400">by {log.actorDisplayName}</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">{log.summary}</p>
            </div>
            <div className="flex items-center gap-3 self-end font-mono text-[11px] text-zinc-400 sm:self-center shrink-0">
              <span>Colo: {log.edgeColo}</span>
              <span className="text-emerald-600 dark:text-emerald-400">{log.latencyMs}ms</span>
              <span>{log.createdAt.slice(0, 19).replace('T', ' ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
