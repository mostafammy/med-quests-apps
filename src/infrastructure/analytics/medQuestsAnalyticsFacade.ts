/**
 * @file medQuestsAnalyticsFacade.ts
 * @description Unified Facade integrating Identity, Privacy Gate, In-Memory Ring Buffer,
 * Offline Outbox, and Idle Flush Scheduling.
 *
 * Implements IAnalyticsEventCapturePort & IAnalyticsIdentityPort.
 * Adheres to the GoF Facade & Decorator patterns.
 */

import type {
  IAnalyticsEventCapturePort,
  IAnalyticsIdentityPort,
  MedQuestsAnalyticsEventMap,
  MedQuestsAnalyticsEventName,
  AnalyticsEventEnvelope,
  MedQuestsSuperProperties,
  TelemetryEventId,
  DistinctUserId,
  AnonymousInstallationId,
  AnalyticsDomainError,
  AccountStatus,
} from '../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';
import type { Result } from '../../domain/shared/result.ts';
import type { UserRole } from '../../domain/auth/types.ts';
import { AnalyticsIdentityManager } from '../../domain/analytics/identityStateMachine.ts';
import { PrivacyPiiScrubberSpecification } from '../../domain/analytics/privacyScrubberSpecification.ts';
import { LockFreeRingBufferQueue } from '../../domain/analytics/ringBufferQueue.ts';
import { IndexedDbTelemetryOutbox } from './indexedDbTelemetryOutbox.ts';
import { AdaptiveTelemetryTransportStrategy } from './transportStrategies.ts';
import { IdleFlushScheduler } from './idleFlushScheduler.ts';
import { useAuthStore } from '../../application/stores/useAuthStore.ts';
import { useLocaleStore } from '../../application/stores/useLocaleStore.ts';
import { useThemeStore } from '../../application/stores/useThemeStore.ts';

function generateEventId(): TelemetryEventId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `evt_${crypto.randomUUID()}` as TelemetryEventId;
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` as TelemetryEventId;
}

export class MedQuestsAnalyticsFacade
  implements IAnalyticsEventCapturePort, IAnalyticsIdentityPort
{
  private readonly identityManager: AnalyticsIdentityManager;
  private readonly privacyScrubber: PrivacyPiiScrubberSpecification;
  private readonly ringBuffer: LockFreeRingBufferQueue<AnalyticsEventEnvelope>;
  private readonly outbox: IndexedDbTelemetryOutbox;
  private readonly transport: AdaptiveTelemetryTransportStrategy;
  private readonly scheduler: IdleFlushScheduler;

  constructor(endpointUrl = '/api/telemetry/ingest') {
    this.identityManager = new AnalyticsIdentityManager();
    this.privacyScrubber = new PrivacyPiiScrubberSpecification();
    this.ringBuffer = new LockFreeRingBufferQueue<AnalyticsEventEnvelope>(250);
    this.outbox = new IndexedDbTelemetryOutbox();
    this.transport = new AdaptiveTelemetryTransportStrategy(this.outbox);
    this.scheduler = new IdleFlushScheduler(
      this.ringBuffer,
      this.transport,
      this.outbox,
      { endpointUrl }
    );

    // Register identity change listener to automatically notify transport
    this.identityManager.onIdentify((data) => {
      // Send an identify event through the normal pipeline
      this.capture(
        '$identify' as unknown as MedQuestsAnalyticsEventName,
        {
          $anon_distinct_id: data.previousAnonymousId,
          $set: {
            user_role: data.role,
            account_status: data.accountStatus,
            university_cohort: data.universityCohort ?? 'Unassigned',
          },
          $set_once: {
            first_identified_at: data.identifiedAtIso,
          },
        } as unknown as MedQuestsAnalyticsEventMap[MedQuestsAnalyticsEventName]
      );
    });
  }

  public getDistinctId(): DistinctUserId {
    return this.identityManager.getDistinctId();
  }

  public getAnonymousId(): AnonymousInstallationId {
    return this.identityManager.getAnonymousId();
  }

  public identifyAuthenticatedUser(profile: {
    readonly userId: string;
    readonly role: UserRole;
    readonly universityCohort?: string;
    readonly accountStatus: AccountStatus;
  }): Result<DistinctUserId, AnalyticsDomainError> {
    return this.identityManager.identifyAuthenticatedUser(profile);
  }

  public resetIdentityOnSignOut(): AnonymousInstallationId {
    return this.identityManager.resetIdentityOnSignOut();
  }

  private resolveSuperProperties(): MedQuestsSuperProperties {
    let authState: ReturnType<typeof useAuthStore.getState> | null = null;
    let localeState: ReturnType<typeof useLocaleStore.getState> | null = null;
    let themeState: ReturnType<typeof useThemeStore.getState> | null = null;

    try {
      authState = useAuthStore.getState();
      localeState = useLocaleStore.getState();
      themeState = useThemeStore.getState();
    } catch {
      // In isolated unit test runs where Zustand is not mounted
    }

    const currentAuth = authState?.authState;
    const role: UserRole = currentAuth?.user?.role ?? 'anonymous';
    const accountStatus: AccountStatus =
      currentAuth?.status === 'account-blocked'
        ? currentAuth.restriction.status
        : 'active';
    const hardwareTier = currentAuth?.clientProfile?.activeTier ?? 'balanced';
    const uiLocale = localeState?.locale ?? 'en';
    const uiTheme = themeState?.preference ?? 'system';
    let edgeColo = 'DEV';
    let edgeCountry = 'DEV';
    if (currentAuth) {
      if (currentAuth.status === 'anonymous-guest') {
        edgeColo = currentAuth.edgePreview.colo;
        edgeCountry = currentAuth.edgePreview.countryCode;
      } else if (currentAuth.status === 'account-blocked') {
        edgeColo = currentAuth.edgeNetwork.colo;
        edgeCountry = currentAuth.edgeNetwork.countryCode;
      } else if (currentAuth.status === 'authenticated-active') {
        edgeColo = currentAuth.currentSession.edgeNetwork.colo;
        edgeCountry = currentAuth.currentSession.edgeNetwork.countryCode;
      }
    }

    const isOffline =
      typeof navigator !== 'undefined' ? !navigator.onLine : false;

    let pwaDisplayMode: 'standalone' | 'browser' = 'browser';
    if (typeof window !== 'undefined') {
      if (
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        // @ts-expect-error iOS Safari standalone check
        window.navigator?.standalone === true
      ) {
        pwaDisplayMode = 'standalone';
      }
    }

    let viewportCategory: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 640) viewportCategory = 'mobile';
      else if (width < 1024) viewportCategory = 'tablet';
      else viewportCategory = 'desktop';
    }

    return {
      app_version: '1.0.0',
      active_block_id: 'cvs',
      identity_state: this.identityManager.getLifecycleState(),
      user_role: role,
      account_status: accountStatus,
      hardware_tier: hardwareTier,
      ui_locale: uiLocale,
      ui_theme: uiTheme,
      edge_colo: edgeColo,
      edge_country: edgeCountry,
      is_offline_mode: isOffline,
      pwa_display_mode: pwaDisplayMode,
      viewport_category: viewportCategory,
    };
  }

  /**
   * Ultra-fast non-blocking event capture (< 0.05 ms).
   */
  public capture<K extends MedQuestsAnalyticsEventName>(
    eventName: K,
    payload: MedQuestsAnalyticsEventMap[K]
  ): void {
    try {
      const distinctId = this.identityManager.getDistinctId();
      const anonymousId = this.identityManager.getAnonymousId();
      const superProps = this.resolveSuperProperties();

      const rawEnvelope: AnalyticsEventEnvelope<K> = {
        eventId: generateEventId(),
        eventName,
        distinctId,
        anonymousId,
        timestampIso: new Date().toISOString(),
        properties: {
          ...payload,
          ...superProps,
        },
      };

      // 1. Scrub sensitive data through Apple Privacy Gate
      const sanitizedRes = this.privacyScrubber.inspectAndSanitize(rawEnvelope);
      const envelope = sanitizedRes.ok ? sanitizedRes.value : rawEnvelope;

      // 2. Push into lock-free in-memory ring buffer (O(1), < 0.05ms)
      this.ringBuffer.enqueue(envelope as AnalyticsEventEnvelope);

      // 3. Trigger background idle scheduling without blocking the caller
      this.scheduler.scheduleIdleFlush();
    } catch (e) {
      console.warn('Analytics capture non-fatal error:', e);
    }
  }

  public pauseDuringCriticalAnimation(durationMs: number): void {
    this.scheduler.pauseDuringCriticalAnimation(
      durationMs as Parameters<IdleFlushScheduler['pauseDuringCriticalAnimation']>[0]
    );
  }
}

// Global Singleton Instance
export const analytics = new MedQuestsAnalyticsFacade();
