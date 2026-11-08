import { create } from 'zustand';
import type {
  AuthState,
  UserRole,
  FeatureFlagKey,
  PerformanceOverrideMode,
} from '../../domain/auth/types.ts';
import type {
  ManagedUserRecord,
  SecurityAuditLogEntry,
} from '../../domain/auth/governanceAnalytics.ts';
import { edgeAuthGateway } from '../../infrastructure/auth/edgeAuthGateway.ts';
import { googleOAuthClient } from '../../infrastructure/auth/googleOAuthClient.ts';
import {
  probeClientCapabilities,
  probeClientCapabilitiesAsync,
  bindAdaptiveCompositorAttributes,
} from '../../infrastructure/auth/clientCapabilityProbe.ts';
import type { ProgressSyncSummary } from '../../../specs/003-edge-auth-adaptive-telemetry/contracts/auth-telemetry-ports.ts';
import { analytics } from '../../infrastructure/analytics/medQuestsAnalyticsFacade.ts';
import {
  syncAnalyticsIdentity,
  executeGoogleSignIn,
  executeAppleSignIn,
} from './auth/oauthSignInService.ts';
import {
  executeAdminUpdateUserRole,
  executeAdminSetUserRestriction,
  executeQuarantineAnomalousAccounts,
  executePurgeDemoData,
} from './auth/authGovernanceService.ts';

export type AuthModalTab = 'sign-in' | 'security-devices' | 'hardware-tier';
export type GovernanceViewTab =
  | 'cloud-observability'
  | 'network-telemetry'
  | 'cohort-analytics'
  | 'user-directory'
  | 'audit-trail'
  | 'question-bank'
  | 'accuracy-audit'
  | 'ai-question-parser';

export interface AuthStoreState {
  readonly authState: AuthState;
  readonly isModalOpen: boolean;
  readonly activeModalTab: AuthModalTab;
  readonly isGovernanceDrawerOpen: boolean;
  readonly activeGovernanceTab: GovernanceViewTab;
  readonly managedUsers: readonly ManagedUserRecord[];
  readonly selectedManagedUserId: string | null;
  readonly auditLogs: readonly SecurityAuditLogEntry[];
  readonly performanceOverride: PerformanceOverrideMode;
  readonly isRevalidating: boolean;
  readonly syncSummary: ProgressSyncSummary | null;
  readonly notificationToast: {
    readonly type: 'success' | 'error' | 'info';
    readonly message: string;
  } | null;

  // Lifecycle
  init: () => () => void;
  revalidate: () => Promise<void>;

  // Modal & Drawer UI
  openModal: (tab?: AuthModalTab) => void;
  closeModal: () => void;
  openGovernanceDrawer: (tab?: GovernanceViewTab) => void;
  closeGovernanceDrawer: () => void;
  setGovernanceTab: (tab: GovernanceViewTab) => void;
  selectManagedUser: (userId: string) => void;
  setPerformanceOverride: (mode: PerformanceOverrideMode) => void;
  clearToast: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;

  // Auth Operations
  signIn: (email: string, password?: string) => Promise<boolean>;
  signInWithGoogle: (email?: string) => Promise<boolean>;
  signInWithApple: (email?: string) => Promise<boolean>;
  elevateToPlatformOwner: () => Promise<boolean>;
  updatePhoneNumber: (phoneNumber: string) => Promise<boolean>;
  signUp: (displayName: string, email: string, password?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  revokeDevice: (sessionId: string) => Promise<void>;

  // Admin Governance Operations
  updateUserRole: (
    targetUserId: string,
    newRole: UserRole,
    customOverrides?: Partial<Record<FeatureFlagKey, boolean>>
  ) => Promise<void>;
  setUserRestriction: (
    targetUserId: string,
    status: 'active' | 'blocked' | 'suspended',
    reason?: string | null,
    blockedUntil?: string | null
  ) => Promise<void>;
  quarantineAnomalousAccounts: () => Promise<void>;
  purgeDemoData: () => Promise<void>;
}

const useAuthStoreBase = create<AuthStoreState>((set, get) => ({
  authState: edgeAuthGateway.getInitialOptimisticState(),
  isModalOpen: false,
  activeModalTab: 'sign-in',
  isGovernanceDrawerOpen: false,
  activeGovernanceTab: 'cloud-observability',
  managedUsers: edgeAuthGateway.getManagedUsers(),
  selectedManagedUserId: edgeAuthGateway.getManagedUsers()[0]?.profile.id ?? null,
  auditLogs: edgeAuthGateway.getAuditLogs(),
  performanceOverride: 'auto',
  isRevalidating: false,
  syncSummary: null,
  notificationToast: null,

  init: () => {
    const profile = probeClientCapabilities(get().performanceOverride);
    const unbind = bindAdaptiveCompositorAttributes(profile);

    if (typeof window !== 'undefined') {
      void googleOAuthClient.loadScript().catch(() => {});

      void googleOAuthClient.consumeRedirectHashToken().then(async (redirectAuth) => {
        if (redirectAuth) {
          const clientProfile = await probeClientCapabilitiesAsync(get().performanceOverride);
          const result = await edgeAuthGateway.signIn({
            email: redirectAuth.claims.email,
            displayName: redirectAuth.claims.name,
            avatarUrl: redirectAuth.claims.picture,
            idToken: redirectAuth.idToken,
            claims: redirectAuth.claims as unknown as Record<string, unknown>,
            provider: 'google',
            clientProfile,
          });
          if (result.ok) {
            const managedUsers = edgeAuthGateway.getManagedUsers();
            set({
              authState: result.value.state,
              syncSummary: result.value.syncSummary,
              managedUsers,
              selectedManagedUserId: result.value.state.user.id,
              isModalOpen: false,
              notificationToast: {
                type: 'success',
                message: `Signed in with Google as ${result.value.state.user.displayName}! Study history merged.`,
              },
            });
          }
          return;
        }

        const scheduleRevalidate = window.requestIdleCallback || ((cb) => setTimeout(cb, 50));
        scheduleRevalidate(() => {
          void get().revalidate();
        });
      });
    }

    return () => unbind();
  },

  revalidate: async () => {
    set({ isRevalidating: true });
    try {
      const result = await edgeAuthGateway.revalidateEdgeSession();
      if (result.ok) {
        const managedUsers = edgeAuthGateway.getManagedUsers();
        syncAnalyticsIdentity(result.value);
        set({ authState: result.value, managedUsers, isRevalidating: false });
        if (
          result.value.status === 'authenticated-active' &&
          result.value.user.role === 'admin'
        ) {
          void edgeAuthGateway.syncManagedUsersFromEdge().then((syncedUsers) => {
            set({ managedUsers: [...syncedUsers] });
          });
        }
      } else {
        if (result.error.code === 'ACCOUNT_BLOCKED') {
          const current = get().authState;
          if (current.status === 'authenticated-active') {
            set({
              authState: {
                status: 'account-blocked',
                user: current.user,
                restriction: result.error.restriction,
                edgeNetwork: current.currentSession.edgeNetwork,
                clientProfile: current.clientProfile,
              },
              isRevalidating: false,
            });
          }
        } else {
          set({ isRevalidating: false });
        }
      }
    } catch {
      set({ isRevalidating: false });
    }
  },

  openModal: (tab = 'sign-in') => {
    if (typeof window !== 'undefined') {
      void googleOAuthClient.loadScript().catch(() => {});
    }
    set({ isModalOpen: true, activeModalTab: tab });
  },

  closeModal: () => {
    set({ isModalOpen: false });
  },

  openGovernanceDrawer: (tab = 'cloud-observability') => {
    const managedUsers = edgeAuthGateway.getManagedUsers();
    const auditLogs = edgeAuthGateway.getAuditLogs();
    set((state) => ({
      isGovernanceDrawerOpen: true,
      activeGovernanceTab: tab,
      managedUsers,
      auditLogs,
      selectedManagedUserId:
        state.selectedManagedUserId ?? managedUsers[0]?.profile.id ?? null,
    }));
    void edgeAuthGateway.syncManagedUsersFromEdge().then((syncedUsers) => {
      set((state) => ({
        managedUsers: [...syncedUsers],
        selectedManagedUserId:
          state.selectedManagedUserId ?? syncedUsers[0]?.profile.id ?? null,
      }));
    });
  },

  closeGovernanceDrawer: () => {
    set({ isGovernanceDrawerOpen: false });
  },

  setGovernanceTab: (tab) => {
    set({ activeGovernanceTab: tab });
  },

  selectManagedUser: (userId) => {
    set({ selectedManagedUserId: userId });
  },

  setPerformanceOverride: (mode: PerformanceOverrideMode) => {
    const updatedProfile = probeClientCapabilities(mode);
    bindAdaptiveCompositorAttributes(updatedProfile);

    const current = get().authState;
    const updatedAuthState: AuthState =
      current.status === 'authenticated-active'
        ? { ...current, clientProfile: updatedProfile }
        : current.status === 'anonymous-guest'
        ? { ...current, clientProfile: updatedProfile }
        : { ...current, clientProfile: updatedProfile };

    set({
      performanceOverride: mode,
      authState: updatedAuthState,
      notificationToast: {
        type: 'info',
        message: `Compositor switched to ${mode.toUpperCase()} tier (${updatedProfile.activeTier})`,
      },
    });
  },

  clearToast: () => {
    set({ notificationToast: null });
  },

  showToast: (type: 'success' | 'error' | 'info', message: string) => {
    set({ notificationToast: { type, message } });
  },

  signIn: async (email: string, password?: string) => {
    const clientProfile = probeClientCapabilities(get().performanceOverride);
    const result = await edgeAuthGateway.signIn({ email, password, clientProfile });

    if (result.ok) {
      const managedUsers = edgeAuthGateway.getManagedUsers();
      syncAnalyticsIdentity(result.value.state);
      set({
        authState: result.value.state,
        syncSummary: result.value.syncSummary,
        managedUsers,
        selectedManagedUserId: result.value.state.user.id,
        isModalOpen: false,
        notificationToast: {
          type: 'success',
          message: `Welcome back, ${result.value.state.user.displayName}! Study progress synchronized.`,
        },
      });
      return true;
    } else {
      const errorMessage =
        'message' in result.error
          ? result.error.message
          : result.error.code === 'ACCOUNT_BLOCKED'
          ? `Account blocked: ${result.error.restriction.blockedReason || 'Administrative restriction'}`
          : 'Authentication failed';

      set({
        notificationToast: {
          type: 'error',
          message: errorMessage,
        },
      });
      return false;
    }
  },

  signInWithGoogle: async (testEmail?: string) => {
    const res = await executeGoogleSignIn(testEmail, get().performanceOverride);
    if (res.ok && res.state) {
      set({
        authState: res.state,
        syncSummary: res.syncSummary ?? null,
        managedUsers: res.managedUsers ?? get().managedUsers,
        selectedManagedUserId: res.state.user.id,
        isModalOpen: false,
        notificationToast: res.toast,
      });
      return true;
    }
    set({ notificationToast: res.toast });
    return false;
  },

  signInWithApple: async (testEmail?: string) => {
    const res = await executeAppleSignIn(testEmail, get().performanceOverride);
    if (res.ok && res.state) {
      set({
        authState: res.state,
        syncSummary: res.syncSummary ?? null,
        managedUsers: res.managedUsers ?? get().managedUsers,
        selectedManagedUserId: res.state.user.id,
        isModalOpen: false,
        notificationToast: res.toast,
      });
      return true;
    }
    set({ notificationToast: res.toast });
    return false;
  },

  elevateToPlatformOwner: async () => {
    try {
      const clientProfile = await probeClientCapabilitiesAsync(get().performanceOverride);
      const result = await edgeAuthGateway.signIn({
        email: 'mostafa.yaser.developer@gmail.com',
        displayName: 'Mostafa Yaser',
        provider: 'google',
        clientProfile,
      });

      if (result.ok) {
        const managedUsers = edgeAuthGateway.getManagedUsers();
        syncAnalyticsIdentity(result.value.state);
        set({
          authState: result.value.state,
          syncSummary: result.value.syncSummary,
          managedUsers,
          selectedManagedUserId: 'usr_owner_mostafa',
          activeGovernanceTab: 'network-telemetry',
          notificationToast: {
            type: 'success',
            message: 'Elevated to Platform Owner (Mostafa Yaser) • Enterprise Edge Telemetry Active',
          },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  updatePhoneNumber: async (phoneNumber: string) => {
    const result = await edgeAuthGateway.updatePhoneNumber(phoneNumber);
    if (result.ok) {
      const current = get().authState;
      if (current.status === 'authenticated-active') {
        set({
          authState: {
            ...current,
            user: result.value,
          },
          notificationToast: {
            type: 'success',
            message: 'Phone number updated! Primary communication channel active.',
          },
        });
        return true;
      }
    }
    return false;
  },

  signUp: async (displayName: string, email: string, password?: string) => {
    const clientProfile = probeClientCapabilities(get().performanceOverride);
    const result = await edgeAuthGateway.signUp({
      displayName,
      email,
      password,
      clientProfile,
    });

    if (result.ok) {
      const managedUsers = edgeAuthGateway.getManagedUsers();
      syncAnalyticsIdentity(result.value.state);
      set({
        authState: result.value.state,
        syncSummary: result.value.syncSummary,
        managedUsers,
        selectedManagedUserId: result.value.state.user.id,
        isModalOpen: false,
        notificationToast: {
          type: 'success',
          message: `Account created for ${displayName}! Local study history merged.`,
        },
      });
      return true;
    } else {
      const errorMessage =
        'message' in result.error
          ? result.error.message
          : result.error.code === 'ACCOUNT_BLOCKED'
          ? `Account blocked: ${result.error.restriction.blockedReason || 'Administrative restriction'}`
          : 'Failed to create account';

      set({
        notificationToast: {
          type: 'error',
          message: errorMessage,
        },
      });
      return false;
    }
  },

  signOut: async () => {
    const result = await edgeAuthGateway.signOut();
    if (result.ok) {
      analytics.resetIdentityOnSignOut();
      set({
        authState: result.value,
        isModalOpen: false,
        isGovernanceDrawerOpen: false,
        notificationToast: {
          type: 'info',
          message: 'Signed out. Operating in anonymous local-first mode.',
        },
      });
    }
  },

  revokeDevice: async (sessionId: string) => {
    const result = await edgeAuthGateway.revokeDeviceSession(sessionId);
    if (result.ok) {
      const current = get().authState;
      if (current.status === 'authenticated-active') {
        set({
          authState: {
            ...current,
            activeSessions: result.value,
          },
          notificationToast: {
            type: 'info',
            message: 'Device session revoked immediately at Cloudflare edge.',
          },
        });
      }
    }
  },

  updateUserRole: async (
    targetUserId: string,
    newRole: UserRole,
    customOverrides = {}
  ) => {
    const res = executeAdminUpdateUserRole(
      get().authState,
      targetUserId,
      newRole,
      customOverrides
    );
    set({
      ...(res.updatedAuthState ? { authState: res.updatedAuthState } : {}),
      managedUsers: res.managedUsers,
      auditLogs: res.auditLogs,
      notificationToast: res.toast,
    });
  },

  setUserRestriction: async (
    targetUserId: string,
    status: 'active' | 'blocked' | 'suspended',
    reason = null,
    blockedUntil = null
  ) => {
    const res = executeAdminSetUserRestriction(
      get().authState,
      targetUserId,
      status,
      reason,
      blockedUntil
    );
    set({
      ...(res.updatedAuthState ? { authState: res.updatedAuthState } : {}),
      managedUsers: res.managedUsers,
      auditLogs: res.auditLogs,
      notificationToast: res.toast,
      ...(status === 'blocked' ? { isGovernanceDrawerOpen: false, isModalOpen: false } : {}),
    });
  },

  quarantineAnomalousAccounts: async () => {
    const res = executeQuarantineAnomalousAccounts(get().authState);
    set({
      managedUsers: res.managedUsers,
      auditLogs: res.auditLogs,
      notificationToast: res.toast,
    });
  },

  purgeDemoData: async () => {
    const res = executePurgeDemoData();
    set({
      managedUsers: res.managedUsers,
      auditLogs: res.auditLogs,
      selectedManagedUserId: res.selectedManagedUserId,
      notificationToast: res.toast,
    });
  },
}));

export const useAuthStore = Object.assign(
  function useAuthStore<U = AuthStoreState>(
    selector?: (state: AuthStoreState) => U
  ): U {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const state = useAuthStoreBase.getState();
      return selector ? selector(state) : (state as unknown as U);
    }
    return useAuthStoreBase(selector as (state: AuthStoreState) => U);
  },
  useAuthStoreBase
) as typeof useAuthStoreBase;
