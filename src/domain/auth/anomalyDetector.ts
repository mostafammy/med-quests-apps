import type {
  ActiveDeviceSession,
  SecurityAnomalyFlag,
  UserRole,
} from './types.ts';
import { ROLE_ENTITLEMENT_POLICIES } from './entitlements.ts';

export interface AnomalyEvaluationContext {
  readonly currentSession: ActiveDeviceSession;
  readonly existingSessions: readonly ActiveDeviceSession[];
  readonly userRole: UserRole;
}

export interface ISessionAnomalyDetector {
  evaluateAnomalies(ctx: AnomalyEvaluationContext): readonly SecurityAnomalyFlag[];
}

/**
 * Domain Service: Evaluates sessions against impossible-travel physics, concurrent-device limits,
 * and edge threat scores without introducing third-party analytics scripts.
 */
export class SessionAnomalyDetectorService implements ISessionAnomalyDetector {
  public evaluateAnomalies(ctx: AnomalyEvaluationContext): readonly SecurityAnomalyFlag[] {
    const flags: SecurityAnomalyFlag[] = [];
    const { currentSession, existingSessions, userRole } = ctx;

    // 1. High Threat IP Score
    if (
      currentSession.edgeNetwork.threatScore !== null &&
      currentSession.edgeNetwork.threatScore >= 50
    ) {
      flags.push('high_threat_ip_score');
    }

    // 2. Excessive Concurrent Devices
    const policy = ROLE_ENTITLEMENT_POLICIES[userRole] ?? ROLE_ENTITLEMENT_POLICIES.anonymous;
    if (existingSessions.length >= policy.maxConcurrentDevices) {
      flags.push('excessive_concurrent_devices');
    }

    // 3. Impossible Travel Geo Shift:
    // Check if another active session was verified in a different country within 2 hours
    const currentCountry = currentSession.edgeNetwork.countryCode;
    const currentTime = new Date(currentSession.lastVerifiedAt).getTime();

    for (const other of existingSessions) {
      if (other.sessionId === currentSession.sessionId) continue;
      const otherCountry = other.edgeNetwork.countryCode;
      if (
        currentCountry !== 'DEV' &&
        otherCountry !== 'DEV' &&
        currentCountry !== otherCountry
      ) {
        const otherTime = new Date(other.lastVerifiedAt).getTime();
        const diffHours = Math.abs(currentTime - otherTime) / (1000 * 60 * 60);
        if (diffHours < 2) {
          flags.push('impossible_travel_geo_shift');
          break;
        }
      }
    }

    return Object.freeze(flags);
  }
}

export const sessionAnomalyDetector = new SessionAnomalyDetectorService();
export const detectSessionAnomalies = (ctx: AnomalyEvaluationContext): readonly SecurityAnomalyFlag[] =>
  sessionAnomalyDetector.evaluateAnomalies(ctx);
