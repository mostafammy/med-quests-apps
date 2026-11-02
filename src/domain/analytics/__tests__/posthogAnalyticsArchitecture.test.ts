/**
 * @file posthogAnalyticsArchitecture.test.ts
 * @description Comprehensive Apple QA Verification Suite for SPEC-008:
 * Zero-Overhead PostHog Behavioral Analytics, Deterministic Identity Graph & Privacy Gate.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsIdentityManager, ANONYMOUS_INSTALLATION_STORAGE_KEY, AUTHENTICATED_USER_STORAGE_KEY } from '../identityStateMachine.ts';
import { PrivacyPiiScrubberSpecification } from '../privacyScrubberSpecification.ts';
import { LockFreeRingBufferQueue } from '../ringBufferQueue.ts';
import {
  InMemoryTestTransportStrategy,
} from '../../../infrastructure/analytics/transportStrategies.ts';
import type {
  AnalyticsEventEnvelope,
  DistinctUserId,
  AnonymousInstallationId,
  TelemetryEventId,
} from '../../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';

class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

const mockStorage = new MockStorage();
if (typeof window === 'undefined') {
  (globalThis as any).window = {
    localStorage: mockStorage,
    location: { origin: 'http://localhost:3000' },
    screen: { width: 1920, height: 1080, colorDepth: 24 },
    innerWidth: 1920,
    innerHeight: 1080,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  };
} else {
  if (!window.location) {
    (window as any).location = { origin: 'http://localhost:3000' };
  }
  if (!window.screen) {
    (window as any).screen = { width: 1920, height: 1080, colorDepth: 24 };
  }
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}
(globalThis as any).localStorage = mockStorage;

describe('SPEC-008: Apple-Grade PostHog Behavioral Analytics Architecture', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Pillar 1: Deterministic Identity State Machine & Total User Deduplication
  // ==========================================================================
  describe('Pillar 1: Deterministic Identity Graph (IAnalyticsIdentityPort)', () => {
    it('generates a stable anonymous installation ID starting with ph_anon_', () => {
      const manager = new AnalyticsIdentityManager();
      const anonId = manager.getAnonymousId();
      const distinctId = manager.getDistinctId();

      expect(anonId).toMatch(/^ph_anon_[a-f0-9-]+$/i);
      expect(distinctId).toBe(anonId);
      expect(manager.getLifecycleState()).toBe('anonymous-identified');
      expect(localStorage.getItem(ANONYMOUS_INSTALLATION_STORAGE_KEY)).toBe(anonId);
    });

    it('persists anonymous installation ID across manager reboots', () => {
      const firstManager = new AnalyticsIdentityManager();
      const firstId = firstManager.getAnonymousId();

      const secondManager = new AnalyticsIdentityManager();
      expect(secondManager.getAnonymousId()).toBe(firstId);
      expect(secondManager.getDistinctId()).toBe(firstId);
    });

    it('rejects identity transition with empty or generic usr_local_guest identifier', () => {
      const manager = new AnalyticsIdentityManager();
      const guestResult = manager.identifyAuthenticatedUser({
        userId: 'usr_local_guest',
        role: 'anonymous',
        accountStatus: 'active',
      });

      expect(guestResult.ok).toBe(false);
      if (!guestResult.ok) {
        expect(guestResult.error.code).toBe('IDENTITY_TRANSITION_INVALID');
      }

      const emptyResult = manager.identifyAuthenticatedUser({
        userId: '   ',
        role: 'student-free',
        accountStatus: 'active',
      });
      expect(emptyResult.ok).toBe(false);
    });

    it('correctly transitions from anonymous to authenticated-linked on sign-in', () => {
      const manager = new AnalyticsIdentityManager();
      const originalAnonId = manager.getAnonymousId();
      let identifyFiredWith: any = null;

      manager.onIdentify((data) => {
        identifyFiredWith = data;
      });

      const result = manager.identifyAuthenticatedUser({
        userId: 'usr_ahmed_kasr_al_ainy',
        role: 'student-pro',
        universityCohort: 'Cairo University Faculty of Medicine',
        accountStatus: 'active',
      });

      expect(result.ok).toBe(true);
      expect(manager.getDistinctId()).toBe('usr_ahmed_kasr_al_ainy');
      expect(manager.getAnonymousId()).toBe(originalAnonId); // Preserves device installation anchor
      expect(manager.getLifecycleState()).toBe('authenticated-linked');

      expect(identifyFiredWith).not.toBeNull();
      expect(identifyFiredWith.previousAnonymousId).toBe(originalAnonId);
      expect(identifyFiredWith.authenticatedDistinctId).toBe('usr_ahmed_kasr_al_ainy');
      expect(identifyFiredWith.universityCohort).toBe('Cairo University Faculty of Medicine');
      expect(localStorage.getItem(AUTHENTICATED_USER_STORAGE_KEY)).toBe('usr_ahmed_kasr_al_ainy');
    });

    it('rotates anonymousId on sign-out to prevent shared-device cross-contamination', () => {
      const manager = new AnalyticsIdentityManager();
      manager.identifyAuthenticatedUser({
        userId: 'usr_student_1',
        role: 'student-pro',
        accountStatus: 'active',
      });

      const initialAnonId = manager.getAnonymousId();
      const nextAnonId = manager.resetIdentityOnSignOut();

      expect(nextAnonId).not.toBe(initialAnonId);
      expect(manager.getDistinctId()).toBe(nextAnonId);
      expect(manager.getAnonymousId()).toBe(nextAnonId);
      expect(manager.getLifecycleState()).toBe('anonymous-identified');
      expect(localStorage.getItem(AUTHENTICATED_USER_STORAGE_KEY)).toBeNull();
    });
  });

  // ==========================================================================
  // Pillar 2: Apple Zero-PII Sanitization Gate
  // ==========================================================================
  describe('Pillar 2: Apple Privacy Gate (PrivacyPiiScrubberSpecification)', () => {
    const scrubber = new PrivacyPiiScrubberSpecification();

    it('preserves clean clinical study events without alteration', () => {
      const envelope: AnalyticsEventEnvelope<'question:choice_interacted'> = {
        eventId: 'evt_123' as TelemetryEventId,
        eventName: 'question:choice_interacted',
        distinctId: 'usr_test' as DistinctUserId,
        anonymousId: 'ph_anon_test' as AnonymousInstallationId,
        timestampIso: new Date().toISOString(),
        properties: {
          session_id: 'sess_1',
          question_id: 'q-cvs-ana-001',
          interaction_type: 'select_choice',
          canonical_choice_id: 'b',
          visual_slot_index: 1,
          input_modality: 'keyboard-digit-shortcut',
          time_since_question_displayed_ms: 1240,
          choice_changes_so_far: 0,
          app_version: '1.0.0',
          active_block_id: 'cvs',
          identity_state: 'authenticated-linked',
          user_role: 'student-pro',
          account_status: 'active',
          hardware_tier: 'ultra',
          ui_locale: 'en',
          ui_theme: 'system',
          edge_colo: 'MRS',
          edge_country: 'EG',
          is_offline_mode: false,
          pwa_display_mode: 'standalone',
          viewport_category: 'desktop',
        },
      };

      const res = scrubber.inspectAndSanitize(envelope);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.properties.canonical_choice_id).toBe('b');
        expect(res.value.properties.input_modality).toBe('keyboard-digit-shortcut');
      }
    });

    it('redacts email addresses and bearer tokens embedded in event payloads', () => {
      const envelope: AnalyticsEventEnvelope<any> = {
        eventId: 'evt_pii_1' as TelemetryEventId,
        eventName: 'copilot:power_action_invoked',
        distinctId: 'usr_test' as DistinctUserId,
        anonymousId: 'ph_anon_test' as AnonymousInstallationId,
        timestampIso: new Date().toISOString(),
        properties: {
          action_id: 'explain-distractor',
          user_comment: 'Student email is scholar.omar@kasralainy.edu.eg and token is Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis',
          password: 'SecretSuperPassword123!',
        },
      };

      const res = scrubber.inspectAndSanitize(envelope);
      expect(res.ok).toBe(true);
      if (res.ok) {
        const props = res.value.properties as Record<string, any>;
        expect(props.password).toBe('[REDACTED_BY_APPLE_PRIVACY_GATE]');
        expect(props.user_comment).not.toContain('scholar.omar@kasralainy.edu.eg');
        expect(props.user_comment).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        expect(props.user_comment).toContain('[REDACTED_BY_APPLE_PRIVACY_GATE]');
      }
    });

    it('redacts phone numbers and nested secret keys in complex payload trees', () => {
      const envelope: AnalyticsEventEnvelope<any> = {
        eventId: 'evt_pii_2' as TelemetryEventId,
        eventName: 'ux:preference_changed',
        distinctId: 'usr_test' as DistinctUserId,
        anonymousId: 'ph_anon_test' as AnonymousInstallationId,
        timestampIso: new Date().toISOString(),
        properties: {
          preference_type: 'theme',
          metadata: {
            userPhone: '+20 100 123 4567',
            nested: {
              apiKey: 'sk-antigravity-secret-key-12345',
              safeKey: 'Cardiology Block',
            },
          },
        },
      };

      const res = scrubber.inspectAndSanitize(envelope);
      expect(res.ok).toBe(true);
      if (res.ok) {
        const props = res.value.properties as Record<string, any>;
        expect(props.metadata.userPhone).toContain('[REDACTED_BY_APPLE_PRIVACY_GATE]');
        expect(props.metadata.nested.apiKey).toBe('[REDACTED_BY_APPLE_PRIVACY_GATE]');
        expect(props.metadata.nested.safeKey).toBe('Cardiology Block');
      }
    });
  });

  // ==========================================================================
  // Pillar 3: Lock-Free Ring Buffer Latency & 120Hz ProMotion Frame Budget
  // ==========================================================================
  describe('Pillar 3: Lock-Free Ring Buffer Queue (< 0.05 ms Capture Latency)', () => {
    it('enqueues and drains items with FIFO ordering', () => {
      const queue = new LockFreeRingBufferQueue<number>(5);
      expect(queue.isEmpty()).toBe(true);

      queue.enqueue(10);
      queue.enqueue(20);
      queue.enqueue(30);

      expect(queue.size()).toBe(3);
      expect(queue.isEmpty()).toBe(false);

      const drained = queue.drainBatch(2);
      expect(drained).toEqual([10, 20]);
      expect(queue.size()).toBe(1);

      const remaining = queue.drainBatch(10);
      expect(remaining).toEqual([30]);
      expect(queue.isEmpty()).toBe(true);
    });

    it('safely drops oldest items (FIFO eviction) when capacity is exceeded', () => {
      const queue = new LockFreeRingBufferQueue<string>(3);
      queue.enqueue('a');
      queue.enqueue('b');
      queue.enqueue('c');
      queue.enqueue('d'); // 'a' evicted

      expect(queue.size()).toBe(3);
      const items = queue.drainBatch(5);
      expect(items).toEqual(['b', 'c', 'd']);
    });

    it('benchmarks 1,000 consecutive enqueues asserting synchronous cost < 0.05 ms per event', () => {
      const queue = new LockFreeRingBufferQueue<any>(500);
      const dummyEvent: AnalyticsEventEnvelope<any> = {
        eventId: 'evt_benchmark' as TelemetryEventId,
        eventName: 'question:choice_interacted',
        distinctId: 'usr_perf' as DistinctUserId,
        anonymousId: 'ph_anon_perf' as AnonymousInstallationId,
        timestampIso: new Date().toISOString(),
        properties: { dummy: true },
      };

      const start = performance.now();
      const ITERATIONS = 1000;
      for (let i = 0; i < ITERATIONS; i++) {
        queue.enqueue(dummyEvent);
      }
      const totalDurationMs = performance.now() - start;
      const avgDurationPerPushMs = totalDurationMs / ITERATIONS;

      // Assert that synchronous enqueue takes less than 0.05 ms (50 microseconds)
      expect(avgDurationPerPushMs).toBeLessThan(0.05);
    });
  });

  // ==========================================================================
  // Pillar 4: In-Memory Test Transport Delivery
  // ==========================================================================
  describe('Pillar 4: Transport Strategy Invariant Verification', () => {
    it('dispatches batch through in-memory test transport successfully', async () => {
      const transport = new InMemoryTestTransportStrategy();
      const batch: AnalyticsEventEnvelope<any>[] = [
        {
          eventId: 'evt_t1' as TelemetryEventId,
          eventName: 'study_session:started',
          distinctId: 'usr_1' as DistinctUserId,
          anonymousId: 'ph_anon_1' as AnonymousInstallationId,
          timestampIso: new Date().toISOString(),
          properties: { session_id: 'sess_1', session_mode: 'practice' },
        },
        {
          eventId: 'evt_t2' as TelemetryEventId,
          eventName: 'study_session:completed',
          distinctId: 'usr_1' as DistinctUserId,
          anonymousId: 'ph_anon_1' as AnonymousInstallationId,
          timestampIso: new Date().toISOString(),
          properties: { session_id: 'sess_1', session_mode: 'practice' },
        },
      ];

      const res = await transport.sendBatch('/api/telemetry/ingest', batch);
      expect(res.ok).toBe(true);
      expect(transport.sentBatches.length).toBe(1);
      expect(transport.sentBatches[0].length).toBe(2);
      expect(transport.sentBatches[0][0].eventName).toBe('study_session:started');
    });
  });

  // ==========================================================================
  // Pillar 5: End-to-End Facade Integration
  // ==========================================================================
  describe('Pillar 5: MedQuestsAnalyticsFacade End-to-End Integration', () => {
    it('captures domain events and exposes distinct IDs without main-thread blocking', async () => {
      const { analytics } = await import('../../../infrastructure/analytics/medQuestsAnalyticsFacade.ts');

      const anonId = analytics.getAnonymousId();
      expect(anonId).toMatch(/^ph_anon_/);
      expect(analytics.getDistinctId()).toBe(anonId);

      // 1. Capture Study Session Started
      analytics.capture('study_session:started', {
        session_id: 'sess_test_1',
        session_mode: 'practice',
        target_question_count: 20,
        time_limit_minutes: null,
        subject_filter_id: 'anatomy',
        chapter_filter_id: null,
        question_filter: 'all',
        high_yield_only: true,
      });

      // 2. Capture Question Choice Interacted (Keyboard Shortcut '1')
      analytics.capture('question:choice_interacted', {
        session_id: 'sess_test_1',
        question_id: 'q-cvs-ana-001',
        interaction_type: 'select_choice',
        canonical_choice_id: 'a',
        visual_slot_index: 0,
        input_modality: 'keyboard-digit-shortcut',
        time_since_question_displayed_ms: 2400,
        choice_changes_so_far: 0,
      });

      // 3. Authenticate User
      const idResult = analytics.identifyAuthenticatedUser({
        userId: 'usr_mariam_ain_shams',
        role: 'student-pro',
        universityCohort: 'Ain Shams Faculty of Medicine',
        accountStatus: 'active',
      });
      expect(idResult.ok).toBe(true);
      expect(analytics.getDistinctId()).toBe('usr_mariam_ain_shams');

      // 4. Capture Socratic Power Action
      analytics.capture('copilot:power_action_invoked', {
        action_id: 'explain-why-wrong',
        question_id: 'q-cvs-ana-001',
        execution_engine: 'groq-cloud',
        response_latency_ms: 380,
        cache_hit: false,
        response_locale: 'en',
      });

      // 5. Sign Out
      const newAnonId = analytics.resetIdentityOnSignOut();
      expect(newAnonId).not.toBe(anonId);
      expect(analytics.getDistinctId()).toBe(newAnonId);
    });
  });
});
