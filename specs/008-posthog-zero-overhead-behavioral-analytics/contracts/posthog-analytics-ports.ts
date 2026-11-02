/**
 * @file posthog-analytics-ports.ts
 * @description Strict Architectural Contracts (Segregated Ports, Branded Value Objects,
 * Discriminated Union Event Taxonomy, GoF Strategy/Decorator/Observer/Proxy Interfaces,
 * and Domain Models) for SPEC-008: Apple-Grade Zero-Overhead PostHog Behavioral Analytics,
 * First-Party Edge Reverse-Proxy & Deterministic Identity Graph Architecture.
 *
 * Designed in accordance with Apple Platform Engineering Standards (120Hz ProMotion
 * Zero-Main-Thread-Blocking Guarantee), Hexagonal Architecture (Ports & Adapters),
 * Domain-Driven Design (DDD), and SOLID Object-Oriented Principles.
 */

import type { Result } from '../../../src/domain/shared/result.ts';
import type {
  UserRole,
  PerformanceTier,
  AccountRestriction,
} from '../../../src/domain/auth/types.ts';

export type AccountStatus = AccountRestriction['status'];
import type { ChoiceId, Confidence } from '../../../src/domain/model/types.ts';
import type { VisualSlotIndex } from '../../006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';

// ============================================================================
// 1. BRANDED SCALAR & DOMAIN VALUE TYPES (IMMUTABLE DDD VALUE OBJECTS)
// ============================================================================

/**
 * Cryptographically stable, privacy-preserving Distinct ID (`ph_anon_<sha256>` or `usr_<id>`).
 * Guarantees accurate Total Unique User Count across anonymous and authenticated states.
 */
export type DistinctUserId = string & { readonly __brand: 'DistinctUserId' };

/**
 * Anonymous device-scoped installation UUIDv7/SHA-256 fingerprint persisted in IndexedDB + localStorage.
 */
export type AnonymousInstallationId = string & { readonly __brand: 'AnonymousInstallationId' };

/**
 * Deterministic UUIDv7 event identifier used for idempotent deduplication in PostHog and the Edge Proxy.
 */
export type TelemetryEventId = string & { readonly __brand: 'TelemetryEventId' };

/**
 * High-resolution monotonic duration in milliseconds (`performance.now()` delta).
 */
export type MonotonicDurationMs = number & { readonly __brand: 'MonotonicDurationMs' };

/**
 * Current identity lifecycle state in the deterministic Identity State Machine.
 */
export type AnalyticsIdentityLifecycleState =
  | 'uninitialized'
  | 'anonymous-identified'
  | 'authenticated-linked'
  | 'opted-out';

/**
 * Delivery transport channel used by the Adaptive Transport Strategy.
 */
export type TelemetryTransportChannel =
  | 'cloudflare-first-party-proxy-fetch' // Normal background idle flush (`POST /api/telemetry/ingest`)
  | 'navigator-send-beacon'              // Page hide / tab close / visibilitychange flush
  | 'indexeddb-offline-outbox'           // Offline queue when `navigator.onLine === false`
  | 'noop-memory-sink';                  // Unit testing / opted-out sink

// ============================================================================
// 2. STRICT DISCRIMINATED-UNION EVENT TAXONOMY (ZERO UNTYPED STRINGS)
// ============================================================================

/**
 * Super-properties automatically attached to every event via `SuperPropertyEnricherDecorator`.
 * Captures hardware tier, locale, Cloudflare Edge PoP, and identity cohort for instant segmentation.
 */
export interface MedQuestsSuperProperties {
  readonly app_version: string;
  readonly active_block_id: string;
  readonly identity_state: AnalyticsIdentityLifecycleState;
  readonly user_role: UserRole;
  readonly account_status: AccountStatus;
  readonly hardware_tier: PerformanceTier;
  readonly ui_locale: 'en' | 'ar';
  readonly ui_theme: 'light' | 'dark' | 'system';
  readonly edge_colo: string;
  readonly edge_country: string;
  readonly is_offline_mode: boolean;
  readonly pwa_display_mode: 'standalone' | 'browser';
  readonly viewport_category: 'mobile' | 'tablet' | 'desktop';
}

/**
 * 1. Lifecycle & Heartbeat Events (For Exact Total Active User Count: DAU / WAU / MAU & Stickiness)
 */
export interface AppBootHydratedPayload {
  readonly boot_hydration_ms: number;
  readonly indexeddb_questions_loaded: number;
  readonly cold_start: boolean;
  readonly referrer_source: string;
}

export interface NavigationRouteViewedPayload {
  readonly route_path: string;
  readonly route_category:
    | 'dashboard'
    | 'test-hub'
    | 'quick-practice'
    | 'mock-setup'
    | 'session-player'
    | 'review-hub'
    | 'curriculum-library'
    | 'question-studio'
    | 'admin-command-center';
  readonly previous_route_path: string | null;
  readonly route_dwell_ms: number;
}

export interface AppEngagementHeartbeatPayload {
  readonly active_foreground_ms: number;
  readonly active_route_category: NavigationRouteViewedPayload['route_category'];
  readonly interactions_in_window: number;
}

/**
 * 2. Study Session & Psychometric Question Interaction Events
 */
export interface StudySessionStartedPayload {
  readonly session_id: string;
  readonly session_mode: 'practice' | 'mock' | 'rapid' | 'retest' | 'exam';
  readonly target_question_count: number;
  readonly time_limit_minutes: number | null;
  readonly subject_filter_id: string | null;
  readonly chapter_filter_id: string | null;
  readonly question_filter: 'all' | 'unanswered' | 'incorrect';
  readonly high_yield_only: boolean;
}

export interface QuestionDisplayedPayload {
  readonly session_id: string;
  readonly question_id: string;
  readonly sequence_index: number;
  readonly subject_id: string;
  readonly chapter_id: string;
  readonly topic_id: string;
  readonly spatial_presentation_mode: 'session-seeded-shuffle' | 'canonical-order';
}

export interface QuestionChoiceInteractedPayload {
  readonly session_id: string;
  readonly question_id: string;
  readonly interaction_type: 'select_choice' | 'change_choice' | 'eliminate_distractor' | 'restore_distractor';
  readonly canonical_choice_id: ChoiceId;
  readonly visual_slot_index: VisualSlotIndex;
  readonly input_modality: 'pointer-click' | 'touch-tap' | 'keyboard-digit-shortcut';
  readonly time_since_question_displayed_ms: number;
  readonly choice_changes_so_far: number;
}

export interface QuestionConfidenceRatedPayload {
  readonly session_id: string;
  readonly question_id: string;
  readonly confidence_level: Confidence;
  readonly input_modality: 'pointer-click' | 'touch-tap' | 'keyboard-shortcut';
}

export interface QuestionAttemptCommittedPayload {
  readonly session_id: string;
  readonly question_id: string;
  readonly subject_id: string;
  readonly chapter_id: string;
  readonly topic_id: string;
  readonly selected_canonical_choice_id: ChoiceId;
  readonly first_instinct_choice_id: ChoiceId | null;
  readonly selected_visual_slot_index: VisualSlotIndex;
  readonly is_correct: boolean;
  readonly confidence_level: Confidence;
  readonly active_dwell_ms: number;
  readonly pacing_quadrant: 'fast-accurate' | 'slow-accurate' | 'fast-wrong' | 'slow-wrong';
  readonly choice_changes_count: number;
  readonly instinct_pivot_outcome: 'none' | 'wrong-to-right' | 'right-to-wrong' | 'wrong-to-wrong';
  readonly eliminated_choices_count: number;
  readonly ai_copilot_consulted: boolean;
  readonly sm2_resulting_interval_days: number;
}

export interface StudySessionCompletedPayload {
  readonly session_id: string;
  readonly session_mode: StudySessionStartedPayload['session_mode'];
  readonly total_questions: number;
  readonly answered_questions: number;
  readonly correct_count: number;
  readonly accuracy_percent: number;
  readonly total_duration_ms: number;
  readonly avg_pace_ms_per_question: number;
  readonly completion_reason: 'user-submitted' | 'timer-expired' | 'early-exit';
}

export interface StudySessionAbandonedPayload {
  readonly session_id: string;
  readonly session_mode: StudySessionStartedPayload['session_mode'];
  readonly abandoned_at_question_index: number;
  readonly total_questions_planned: number;
  readonly answered_before_abandon_count: number;
  readonly elapsed_duration_ms: number;
}

/**
 * 3. Socratic AI Co-Pilot & Power Action Events
 */
export interface CopilotDrawerToggledPayload {
  readonly is_open: boolean;
  readonly trigger_source: 'floating-pill' | 'keyboard-shortcut' | 'explanation-cta' | 'post-test-report';
  readonly active_question_id: string | null;
}

export interface CopilotPowerActionInvokedPayload {
  readonly action_id: string;
  readonly question_id: string | null;
  readonly execution_engine: 'offline-deterministic' | 'groq-cloud' | 'gemini-cloud' | 'power-action-cache';
  readonly response_latency_ms: number;
  readonly cache_hit: boolean;
  readonly response_locale: 'en' | 'ar';
}

/**
 * 4. Global Question Bank Sync, Studio & UX Preference Events
 */
export interface GlobalBankSyncExecutedPayload {
  readonly block_id: string;
  readonly sync_outcome: 'up-to-date-304' | 'delta-merged' | 'offline-skipped' | 'error';
  readonly remote_revision: number;
  readonly added_count: number;
  readonly updated_count: number;
  readonly retained_local_custom_count: number;
  readonly sync_duration_ms: number;
}

export interface UxPreferenceChangedPayload {
  readonly preference_type: 'theme' | 'locale';
  readonly previous_value: string;
  readonly next_value: string;
}

/**
 * Master Map of Event Names to Strictly Typed Payloads.
 * Enforces compile-time validation across the entire application.
 */
export interface MedQuestsAnalyticsEventMap {
  readonly 'app:boot_hydrated': AppBootHydratedPayload;
  readonly 'navigation:route_viewed': NavigationRouteViewedPayload;
  readonly 'app:engagement_heartbeat': AppEngagementHeartbeatPayload;
  readonly 'study_session:started': StudySessionStartedPayload;
  readonly 'question:displayed': QuestionDisplayedPayload;
  readonly 'question:choice_interacted': QuestionChoiceInteractedPayload;
  readonly 'question:confidence_rated': QuestionConfidenceRatedPayload;
  readonly 'question:attempt_committed': QuestionAttemptCommittedPayload;
  readonly 'study_session:completed': StudySessionCompletedPayload;
  readonly 'study_session:abandoned': StudySessionAbandonedPayload;
  readonly 'copilot:drawer_toggled': CopilotDrawerToggledPayload;
  readonly 'copilot:power_action_invoked': CopilotPowerActionInvokedPayload;
  readonly 'bank:global_sync_executed': GlobalBankSyncExecutedPayload;
  readonly 'ux:preference_changed': UxPreferenceChangedPayload;
}

export type MedQuestsAnalyticsEventName = keyof MedQuestsAnalyticsEventMap;

/**
 * Canonical Immutable Analytics Envelope ready for queueing and edge ingestion.
 */
export interface AnalyticsEventEnvelope<
  K extends MedQuestsAnalyticsEventName = MedQuestsAnalyticsEventName,
> {
  readonly eventId: TelemetryEventId;
  readonly eventName: K;
  readonly distinctId: DistinctUserId;
  readonly anonymousId: AnonymousInstallationId;
  readonly timestampIso: string;
  readonly properties: Readonly<MedQuestsAnalyticsEventMap[K] & MedQuestsSuperProperties>;
}

// ============================================================================
// 3. DOMAIN ERROR TYPES
// ============================================================================

export type AnalyticsDomainErrorCode =
  | 'INVALID_EVENT_SCHEMA'
  | 'PII_VIOLATION_DETECTED'
  | 'OUTBOX_QUOTA_EXCEEDED'
  | 'EDGE_PROXY_INGEST_FAILED'
  | 'IDENTITY_TRANSITION_INVALID';

export interface AnalyticsDomainError {
  readonly code: AnalyticsDomainErrorCode;
  readonly message: string;
  readonly offendingField?: string;
  readonly retryable: boolean;
}

// ============================================================================
// 4. SEGREGATED ARCHITECTURAL PORTS (INTERFACE SEGREGATION PRINCIPLE - ISP)
// ============================================================================

/**
 * Port 1: Ultra-Fast Non-Blocking Event Capture Port (`< 0.05 ms` synchronous execution).
 * Consumed by Domain Services, Zustand Stores, and UI Hooks.
 */
export interface IAnalyticsEventCapturePort {
  /**
   * Enqueues a strongly-typed behavioral event into the lock-free ring buffer.
   * NEVER performs synchronous network I/O or blocks the 120Hz UI thread.
   */
  capture<K extends MedQuestsAnalyticsEventName>(
    eventName: K,
    payload: MedQuestsAnalyticsEventMap[K]
  ): void;
}

/**
 * Port 2: Deterministic User Identity & Alias Lifecycle Port.
 * Ensures Total Use Count is 100% deduplicated whether a student is anonymous or signed in.
 */
export interface IAnalyticsIdentityPort {
  /**
   * Returns the current resolved DistinctUserId (`ph_anon_<hash>` or `usr_<id>`).
   */
  getDistinctId(): DistinctUserId;

  /**
   * Returns the persistent device installation ID (`AnonymousInstallationId`).
   */
  getAnonymousId(): AnonymousInstallationId;

  /**
   * Links an anonymous scholar (`ph_anon_*`) to their authenticated `UserProfile` on sign-in,
   * emitting PostHog `$identify` + `$set` (and `$set_once` for `first_seen_at`, `initial_cohort`).
   */
  identifyAuthenticatedUser(profile: {
    readonly userId: string;
    readonly role: UserRole;
    readonly universityCohort?: string;
    readonly accountStatus: AccountStatus;
  }): Result<DistinctUserId, AnalyticsDomainError>;

  /**
   * Safely resets the active `DistinctUserId` to a fresh `AnonymousInstallationId` on sign-out
   * so shared library/hospital computers never cross-contaminate user graphs.
   */
  resetIdentityOnSignOut(): AnonymousInstallationId;
}

/**
 * Port 3: Privacy & PII Sanitization Specification Port (Specification Pattern).
 * Guarantees zero medical vignettes, raw AI prompts, emails, or tokens ever leave the client.
 */
export interface IAnalyticsPrivacySpecification {
  /**
   * Validates and scrubs an event envelope prior to serialization.
   */
  inspectAndSanitize<K extends MedQuestsAnalyticsEventName>(
    envelope: AnalyticsEventEnvelope<K>
  ): Result<AnalyticsEventEnvelope<K>, AnalyticsDomainError>;
}

/**
 * Port 4: Offline-First Durable Outbox Port (IndexedDB / LocalStorage Ring Buffer).
 * Ensures zero event loss when students study offline on the metro or in hospital wards.
 */
export interface IAnalyticsOfflineOutboxPort {
  enqueueBatch(events: readonly AnalyticsEventEnvelope[]): Promise<Result<number, AnalyticsDomainError>>;
  dequeuePendingBatch(maxBatchSize: number): Promise<readonly AnalyticsEventEnvelope[]>;
  acknowledgeDelivered(eventIds: readonly TelemetryEventId[]): Promise<void>;
  getPendingCount(): Promise<number>;
}

/**
 * Port 5: Adaptive Telemetry Transport Strategy (GoF Strategy Pattern).
 * Dynamically selects between `fetch(..., { keepalive: true })`, `navigator.sendBeacon`,
 * or offline outbox storage based on document visibility and network connectivity.
 */
export interface IAnalyticsTransportStrategy {
  readonly channelId: TelemetryTransportChannel;
  sendBatch(
    endpointUrl: string,
    batch: readonly AnalyticsEventEnvelope[]
  ): Promise<Result<{ acceptedCount: number }, AnalyticsDomainError>>;
}

/**
 * Port 6: Main-Thread-Yielding Batch Scheduler Port.
 * Flushes queued events strictly inside `requestIdleCallback` (with deadline budget checks)
 * or on `visibilitychange === 'hidden'`, protecting 120fps animations.
 */
export interface IAnalyticsFlushSchedulerPort {
  scheduleIdleFlush(): void;
  flushImmediatelyOnPageHide(): void;
  pauseDuringCriticalAnimation(durationMs: MonotonicDurationMs): void;
}

/**
 * Port 7: Executive Cohort & Product Usage Insights Read Port (Admin Command Center Integration).
 * Allows the in-app Admin Dashboard to display verified PostHog Total Use Count, DAU/WAU/MAU,
 * Retention Matrix, and Feature Adoption Funnels via the Cloudflare Worker proxy.
 */
export interface IPostHogExecutiveInsightsPort {
  fetchUsageOverview(timeframeWindow: '24h' | '7d' | '30d'): Promise<
    Result<PostHogExecutiveUsageSnapshot, AnalyticsDomainError>
  >;
}

export interface PostHogExecutiveUsageSnapshot {
  readonly generatedAtIso: string;
  readonly totalUniqueScholarsAllTime: number;
  readonly dailyActiveScholarsDau: number;
  readonly weeklyActiveScholarsWau: number;
  readonly monthlyActiveScholarsMau: number;
  readonly stickinessRatioDauMauPercent: number;
  readonly authenticatedVsAnonymousRatio: {
    readonly authenticatedCount: number;
    readonly anonymousDeviceCount: number;
  };
  readonly studySessionFunnel: {
    readonly appBootCount: number;
    readonly sessionStartedCount: number;
    readonly firstQuestionAnsweredCount: number;
    readonly sessionCompletedCount: number;
    readonly overallCompletionRatePercent: number;
  };
  readonly featureInteractionBreakdown: {
    readonly totalQuestionsAnswered: number;
    readonly keyboardShortcutUsagePercent: number;
    readonly distractorEliminationUsagePercent: number;
    readonly aiCopilotConsultationsCount: number;
    readonly arabicRtlToggleRatePercent: number;
  };
}
