/**
 * Domain Service & RBAC Guard: AdminAccuracyAuditService
 * Enforces strict Apple-standard administrator authorization before granting access
 * to global question bank random sampling, AI accuracy evaluation, and clinical quality telemetry.
 *
 * Adheres to SOLID:
 * - Single Responsibility: Authorizing and executing administrative accuracy audits.
 * - Guard Pattern / Defense in Depth: Rejects non-admin actors immediately.
 * - Dependency Inversion: Accepts question population providers and audit engines.
 */

import type { Question } from '../../model/types.ts';
import type { UserRole, UserId } from '../../auth/types.ts';
import { RolePolicyEvaluator } from '../../auth/entitlements.ts';
import { AccuracyAuditEngine } from './AccuracyAuditEngine.ts';
import type {
  SamplingConfiguration,
  AccuracyAuditRunReport,
  AuditProgressCallback,
} from './types.ts';
import { edgeAuthGateway } from '../../../infrastructure/auth/edgeAuthGateway.ts';

export class AdminAuthorizationError extends Error {
  constructor(message = 'Access Denied: Only administrators have privilege to perform Question Bank Accuracy Audits.') {
    super(message);
    this.name = 'AdminAuthorizationError';
  }
}

export interface AdminActorContext {
  readonly userId: UserId;
  readonly role: UserRole;
  readonly displayName: string;
}

export class AdminAccuracyAuditService {
  private readonly policyEvaluator = new RolePolicyEvaluator();
  private readonly auditEngine: AccuracyAuditEngine;
  private inMemoryHistory: AccuracyAuditRunReport[] = [];
  private static readonly STORAGE_KEY = 'medquests_accuracy_audit_history_v1';

  constructor(auditEngine?: AccuracyAuditEngine) {
    this.auditEngine = auditEngine ?? new AccuracyAuditEngine();
  }

  /**
   * Verifies that the actor has explicit administrative privileges.
   * Throws AdminAuthorizationError if unprivileged.
   */
  public verifyAdminPrivileges(actor: AdminActorContext): void {
    const hasAdminEntitlement = this.policyEvaluator.hasEntitlement(
      actor.role,
      'security_governance_admin'
    );

    if (actor.role !== 'admin' || !hasAdminEntitlement) {
      throw new AdminAuthorizationError(
        `Security Violation: User '${actor.displayName}' (${actor.role}) lacks 'security_governance_admin' authorization.`
      );
    }
  }

  /**
   * Executes an end-to-end question bank accuracy audit on a random or stratified sample.
   */
  public async executeAdminAudit(
    actor: AdminActorContext,
    population: readonly Question[],
    config: SamplingConfiguration,
    onProgress?: AuditProgressCallback,
    signal?: AbortSignal
  ): Promise<AccuracyAuditRunReport> {
    // 1. RBAC Guard check
    this.verifyAdminPrivileges(actor);

    // 2. Validate population
    if (!population || population.length === 0) {
      throw new Error('Cannot execute audit: Global Question Bank population is empty.');
    }

    // 3. Run audit engine
    const report = await this.auditEngine.runAudit(
      population,
      config,
      { userId: actor.userId, displayName: actor.displayName },
      onProgress,
      signal
    );

    // 4. Record security audit log entry
    try {
      edgeAuthGateway.logSecurityAudit({
        actorUserId: actor.userId,
        actorDisplayName: actor.displayName,
        targetUserId: actor.userId,
        targetDisplayName: 'Global Question Bank',
        action: 'ROLE_MODIFIED' as any, // Audit action
        summary: `Admin executed Question Bank Accuracy Audit (${report.kpis.totalSampled} items, Score: ${report.kpis.overallAccuracyIndex}%, Strategy: ${config.strategyType})`,
        edgeColo: 'SFO-APPLE-EDGE',
        latencyMs: report.durationMs,
      });
    } catch {
      // In-memory or offline environment resilience
    }

    // 5. Persist run report to local history
    this.persistReportToHistory(report);

    return report;
  }

  public getHistoricalAuditReports(): AccuracyAuditRunReport[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(AdminAccuracyAuditService.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AccuracyAuditRunReport[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // Fall through to in-memory history
    }
    return [...this.inMemoryHistory];
  }

  public clearAuditHistory(): void {
    this.inMemoryHistory = [];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(AdminAccuracyAuditService.STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  private persistReportToHistory(report: AccuracyAuditRunReport): void {
    const existing = this.inMemoryHistory.filter((r) => r.runId !== report.runId);
    this.inMemoryHistory = [report, ...existing].slice(0, 25);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AdminAccuracyAuditService.STORAGE_KEY, JSON.stringify(this.inMemoryHistory));
      }
    } catch {
      // Ignore storage quota limits gracefully
    }
  }
}
