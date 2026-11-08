import type { AuthState, EdgeNetworkTelemetry } from '../../domain/auth/types.ts';
import { resolveFeatureEntitlements } from '../../domain/auth/entitlements.ts';
import { probeClientCapabilities } from './clientCapabilityProbe.ts';

export const AUTH_STORAGE_KEYS = {
  USER: 'medquests_auth_user',
  SESSION: 'medquests_auth_session',
  TOKEN: 'medquests_auth_token',
  ALL_SESSIONS: 'medquests_auth_all_sessions',
  MANAGED_DIRECTORY: 'medquests_admin_directory_v2',
  AUDIT_LOGS: 'medquests_admin_audit_logs_v2',
  LOCAL_TELEMETRY: 'medquests_local_study_telemetry_v1',
} as const;

/**
 * Creates the default anonymous guest state.
 */
export function createDefaultGuestState(): AuthState {
  const clientProfile = probeClientCapabilities('auto');
  const edgePreview: EdgeNetworkTelemetry = {
    ipAddress: '127.0.0.1',
    countryCode: 'EG',
    countryName: 'Egypt',
    city: 'Cairo',
    region: 'Cairo Governorate',
    continent: 'AF',
    latitude: 30.0444,
    longitude: 31.2357,
    postalCode: '11511',
    edgeTimezone: clientProfile.clientTimezone,
    asn: 8452,
    ispOrganization: 'Telecom Egypt',
    colo: 'CAI',
    httpProtocol: 'HTTP/3',
    tlsVersion: 'TLSv1.3',
    ja4Fingerprint: null,
    threatScore: 0,
    capturedAt: new Date().toISOString(),
  };

  return {
    status: 'anonymous-guest',
    user: {
      id: 'usr_local_guest',
      displayName: 'Local Scholar',
      role: 'anonymous',
    },
    entitlements: resolveFeatureEntitlements('anonymous'),
    clientProfile,
    edgePreview,
  };
}
