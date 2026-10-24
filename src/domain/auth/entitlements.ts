import type {
  UserRole,
  FeatureFlagKey,
  FeatureEntitlementMap,
} from './types.ts';

export interface RoleEntitlementPolicy {
  readonly role: UserRole;
  readonly label: string;
  readonly badgeTone: 'slate' | 'blue' | 'indigo' | 'emerald' | 'amber';
  readonly defaultFeatures: FeatureEntitlementMap;
  readonly maxConcurrentDevices: number;
  readonly dailyCloudAiRequestsLimit: number;
}

export const ROLE_ENTITLEMENT_POLICIES: Readonly<Record<UserRole, RoleEntitlementPolicy>> = {
  anonymous: {
    role: 'anonymous',
    label: 'Local Guest',
    badgeTone: 'slate',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: false,
      ai_cloud_streaming_quota: false,
      multi_block_unlock: true,
      question_studio_author: true,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 1,
    dailyCloudAiRequestsLimit: 0,
  },
  'student-free': {
    role: 'student-free',
    label: 'Student',
    badgeTone: 'blue',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: false,
      multi_block_unlock: true,
      question_studio_author: false,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 2,
    dailyCloudAiRequestsLimit: 15,
  },
  'student-pro': {
    role: 'student-pro',
    label: 'Scholar Pro',
    badgeTone: 'indigo',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: true,
      multi_block_unlock: true,
      question_studio_author: false,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 4,
    dailyCloudAiRequestsLimit: 250,
  },
  'faculty-reviewer': {
    role: 'faculty-reviewer',
    label: 'Faculty Reviewer',
    badgeTone: 'emerald',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: true,
      multi_block_unlock: true,
      question_studio_author: true,
      security_governance_admin: false,
    },
    maxConcurrentDevices: 5,
    dailyCloudAiRequestsLimit: 500,
  },
  admin: {
    role: 'admin',
    label: 'Platform Admin',
    badgeTone: 'amber',
    defaultFeatures: {
      local_practice_and_mock: true,
      local_grounded_copilot: true,
      cloud_sync_backup: true,
      ai_cloud_streaming_quota: true,
      multi_block_unlock: true,
      question_studio_author: true,
      security_governance_admin: true,
    },
    maxConcurrentDevices: 10,
    dailyCloudAiRequestsLimit: 5000,
  },
};

/**
 * Interface segregation: Contract for evaluating permissions and feature entitlements.
 */
export interface IRolePolicyEvaluator {
  getPolicy(role: UserRole): RoleEntitlementPolicy;
  resolveEntitlements(
    role: UserRole,
    customOverrides?: Partial<Record<FeatureFlagKey, boolean>>
  ): FeatureEntitlementMap;
  hasEntitlement(
    role: UserRole,
    flag: FeatureFlagKey,
    customOverrides?: Partial<Record<FeatureFlagKey, boolean>>
  ): boolean;
  canAccessRoute(role: UserRole, routePath: string): boolean;
}

/**
 * Domain Service: Evaluates role-based permissions and feature entitlement flags.
 * Adheres to Single Responsibility & Open/Closed principles.
 */
export class RolePolicyEvaluator implements IRolePolicyEvaluator {
  public getPolicy(role: UserRole): RoleEntitlementPolicy {
    return ROLE_ENTITLEMENT_POLICIES[role] ?? ROLE_ENTITLEMENT_POLICIES.anonymous;
  }

  public resolveEntitlements(
    role: UserRole,
    customOverrides: Partial<Record<FeatureFlagKey, boolean>> = {}
  ): FeatureEntitlementMap {
    const policy = this.getPolicy(role);
    return {
      ...policy.defaultFeatures,
      ...customOverrides,
      // Constitution P1/P8 invariants: local practice & local copilot are NEVER disabled
      local_practice_and_mock: true,
      local_grounded_copilot: true,
    };
  }

  public hasEntitlement(
    role: UserRole,
    flag: FeatureFlagKey,
    customOverrides: Partial<Record<FeatureFlagKey, boolean>> = {}
  ): boolean {
    const entitlements = this.resolveEntitlements(role, customOverrides);
    return Boolean(entitlements[flag]);
  }

  public canAccessRoute(role: UserRole, routePath: string): boolean {
    if (routePath.startsWith('/studio')) {
      return this.hasEntitlement(role, 'question_studio_author');
    }
    return true;
  }
}

export const rolePolicyEvaluator = new RolePolicyEvaluator();

export const resolveFeatureEntitlements = (
  role: UserRole,
  customOverrides?: Partial<Record<FeatureFlagKey, boolean>>
): FeatureEntitlementMap => rolePolicyEvaluator.resolveEntitlements(role, customOverrides);

export const hasFeatureEntitlement = (
  role: UserRole,
  flag: FeatureFlagKey,
  customOverrides?: Partial<Record<FeatureFlagKey, boolean>>
): boolean => rolePolicyEvaluator.hasEntitlement(role, flag, customOverrides);
