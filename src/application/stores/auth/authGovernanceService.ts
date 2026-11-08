/**
 * AuthGovernanceService
 *
 * Dedicated domain and store service for administrator governance workflows:
 * - Role transitions & custom feature overrides
 * - Account restrictions (suspension, blocking, unblocking)
 * - Security anomaly quarantine
 * - Demo account purging
 */

import type { UserRole, FeatureFlagKey, AuthState } from '../../../domain/auth/types.ts';
import { resolveFeatureEntitlements } from '../../../domain/auth/entitlements.ts';
import type { ManagedUserRecord, SecurityAuditLogEntry } from '../../../domain/auth/governanceAnalytics.ts';
import { edgeAuthGateway } from '../../../infrastructure/auth/edgeAuthGateway.ts';

export interface GovernanceMutationResult {
  updatedAuthState?: AuthState;
  managedUsers: ManagedUserRecord[];
  auditLogs: SecurityAuditLogEntry[];
  toast: {
    type: 'success' | 'error' | 'info';
    message: string;
  };
}

export function executeAdminUpdateUserRole(
  currentAuthState: AuthState,
  targetUserId: string,
  newRole: UserRole,
  customOverrides: Partial<Record<FeatureFlagKey, boolean>> = {}
): GovernanceMutationResult {
  const actorName =
    currentAuthState.status === 'authenticated-active'
      ? currentAuthState.user.displayName
      : 'Platform Admin';

  const updatedRecord = edgeAuthGateway.updateManagedUserRoleAndFeatures({
    targetUserId,
    newRole,
    customFeatureOverrides: customOverrides,
    actorDisplayName: actorName,
  });

  const managedUsers = [...edgeAuthGateway.getManagedUsers()];
  const auditLogs = [...edgeAuthGateway.getAuditLogs()];

  if (currentAuthState.status === 'authenticated-active' && currentAuthState.user.id === targetUserId) {
    const updatedUser = updatedRecord
      ? updatedRecord.profile
      : {
          ...currentAuthState.user,
          role: newRole,
          customFeatureOverrides: {
            ...currentAuthState.user.customFeatureOverrides,
            ...customOverrides,
          },
        };
    const updatedEntitlements = resolveFeatureEntitlements(
      newRole,
      updatedUser.customFeatureOverrides
    );

    return {
      updatedAuthState: {
        ...currentAuthState,
        user: updatedUser,
        entitlements: updatedEntitlements,
      },
      managedUsers,
      auditLogs,
      toast: {
        type: 'success',
        message: `Updated ${updatedUser.displayName} (${newRole}). Workers KV synchronized.`,
      },
    };
  }

  return {
    managedUsers,
    auditLogs,
    toast: {
      type: 'success',
      message: `Updated ${updatedRecord?.profile.displayName ?? targetUserId} (${newRole}). Edge KV cache invalidated.`,
    },
  };
}

export function executeAdminSetUserRestriction(
  currentAuthState: AuthState,
  targetUserId: string,
  status: 'active' | 'blocked' | 'suspended',
  reason: string | null = null,
  blockedUntil: string | null = null
): GovernanceMutationResult {
  const actorName =
    currentAuthState.status === 'authenticated-active'
      ? currentAuthState.user.displayName
      : 'Platform Admin';

  const updatedRecord = edgeAuthGateway.setManagedUserRestriction({
    targetUserId,
    status,
    reason,
    blockedUntil,
    actorDisplayName: actorName,
  });

  const managedUsers = [...edgeAuthGateway.getManagedUsers()];
  const auditLogs = [...edgeAuthGateway.getAuditLogs()];

  if (currentAuthState.status === 'authenticated-active' && currentAuthState.user.id === targetUserId) {
    const nowIso = new Date().toISOString();
    const restriction = updatedRecord?.profile.restriction ?? {
      status,
      blockedReason: reason,
      blockedUntil,
      blockedByUserId: 'usr_admin',
      updatedAt: nowIso,
    };

    if (status === 'blocked') {
      return {
        updatedAuthState: {
          status: 'account-blocked',
          user: { ...currentAuthState.user, restriction },
          restriction,
          edgeNetwork: currentAuthState.currentSession.edgeNetwork,
          clientProfile: currentAuthState.clientProfile,
        },
        managedUsers,
        auditLogs,
        toast: {
          type: 'error',
          message: 'Account restricted. Edge KV guard enforced globally.',
        },
      };
    } else {
      return {
        updatedAuthState: {
          ...currentAuthState,
          user: { ...currentAuthState.user, restriction },
        },
        managedUsers,
        auditLogs,
        toast: {
          type: 'success',
          message: 'Account restriction cleared.',
        },
      };
    }
  }

  return {
    managedUsers,
    auditLogs,
    toast: {
      type: status === 'active' ? 'success' : 'error',
      message:
        status === 'active'
          ? `Unblocked ${updatedRecord?.profile.displayName ?? targetUserId}. Access restored.`
          : `Enforced ${status.toUpperCase()} on ${updatedRecord?.profile.displayName ?? targetUserId}. All active KV sessions evicted.`,
    },
  };
}

export function executeQuarantineAnomalousAccounts(currentAuthState: AuthState): GovernanceMutationResult {
  const actorName =
    currentAuthState.status === 'authenticated-active'
      ? currentAuthState.user.displayName
      : 'Platform Admin';
  const count = edgeAuthGateway.quarantineAnomalousAccounts(actorName);
  const managedUsers = [...edgeAuthGateway.getManagedUsers()];
  const auditLogs = [...edgeAuthGateway.getAuditLogs()];

  return {
    managedUsers,
    auditLogs,
    toast: {
      type: count > 0 ? 'info' : 'success',
      message:
        count > 0
          ? `Quarantined ${count} account(s) flagged with security anomalies.`
          : 'No active unquarantined security anomalies detected.',
    },
  };
}

export function executePurgeDemoData(): {
  managedUsers: ManagedUserRecord[];
  auditLogs: SecurityAuditLogEntry[];
  selectedManagedUserId: string | null;
  toast: { type: 'success'; message: string };
} {
  const { purgedUsersCount } = edgeAuthGateway.purgeDemoData();
  const managedUsers = [...edgeAuthGateway.getManagedUsers()];
  const auditLogs = [...edgeAuthGateway.getAuditLogs()];

  return {
    managedUsers,
    auditLogs,
    selectedManagedUserId: managedUsers[0]?.profile.id ?? null,
    toast: {
      type: 'success',
      message:
        purgedUsersCount > 0
          ? `Purged ${purgedUsersCount} demo account(s). Directory clean for production.`
          : 'Directory is already clean for production.',
    },
  };
}
