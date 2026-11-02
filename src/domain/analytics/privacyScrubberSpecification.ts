/**
 * @file privacyScrubberSpecification.ts
 * @description Apple-Grade Zero-PII Sanitization & Privacy Verification Specification.
 *
 * Adheres to the GoF Specification Pattern & Single Responsibility Principle (SRP).
 * Validates that no student emails, bearer tokens, passwords, phone numbers,
 * or raw clinical chat prompts ever leak into behavioral analytics envelopes.
 */

import { ok, type Result } from '../shared/result.ts';
import type {
  IAnalyticsPrivacySpecification,
  AnalyticsEventEnvelope,
  MedQuestsAnalyticsEventName,
  AnalyticsDomainError,
} from '../../../specs/008-posthog-zero-overhead-behavioral-analytics/contracts/posthog-analytics-ports.ts';

const REDACTED_PLACEHOLDER = '[REDACTED_BY_APPLE_PRIVACY_GATE]';

// Regex patterns for sensitive data
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/g;
const BEARER_AUTH_REGEX = /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;
const PHONE_NUMBER_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

const FORBIDDEN_KEY_REGEX =
  /^(password|token|bearer|secret|apiKey|api_key|phoneNumber|phone_number|email|rawPrompt|raw_prompt)$/i;

export class PrivacyPiiScrubberSpecification implements IAnalyticsPrivacySpecification {
  /**
   * Sanitizes a value recursively, scrubbing strings and stripping forbidden keys.
   */
  private sanitizeValue(val: unknown, keyContext?: string): unknown {
    if (val === null || val === undefined) {
      return val;
    }

    if (keyContext && FORBIDDEN_KEY_REGEX.test(keyContext)) {
      return REDACTED_PLACEHOLDER;
    }

    if (typeof val === 'string') {
      let sanitized = val;
      if (JWT_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(JWT_REGEX, REDACTED_PLACEHOLDER);
      }
      if (BEARER_AUTH_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(BEARER_AUTH_REGEX, REDACTED_PLACEHOLDER);
      }
      if (EMAIL_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(EMAIL_REGEX, REDACTED_PLACEHOLDER);
      }
      if (PHONE_NUMBER_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(PHONE_NUMBER_REGEX, REDACTED_PLACEHOLDER);
      }
      return sanitized;
    }

    if (Array.isArray(val)) {
      return val.map((item) => this.sanitizeValue(item, keyContext));
    }

    if (typeof val === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (FORBIDDEN_KEY_REGEX.test(k)) {
          sanitizedObj[k] = REDACTED_PLACEHOLDER;
        } else {
          sanitizedObj[k] = this.sanitizeValue(v, k);
        }
      }
      return sanitizedObj;
    }

    return val;
  }

  /**
   * Validates and scrubs an event envelope prior to buffering or dispatch.
   */
  public inspectAndSanitize<K extends MedQuestsAnalyticsEventName>(
    envelope: AnalyticsEventEnvelope<K>
  ): Result<AnalyticsEventEnvelope<K>, AnalyticsDomainError> {
    const sanitizedProperties = this.sanitizeValue(envelope.properties) as AnalyticsEventEnvelope<K>['properties'];

    const sanitizedEnvelope: AnalyticsEventEnvelope<K> = {
      ...envelope,
      properties: Object.freeze(sanitizedProperties),
    };

    return ok(sanitizedEnvelope);
  }
}
