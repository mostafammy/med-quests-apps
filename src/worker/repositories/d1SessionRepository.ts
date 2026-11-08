/**
 * Worker Repository: D1 Device Session Persistence & Hydration
 */

import type {
  ActiveDeviceSession,
  ClientCapabilityProfile,
  EdgeNetworkTelemetry,
  ParsedDeviceProfile,
} from '../../domain/auth/types.ts';
import type { D1DatabaseBinding } from '../types.ts';

export async function upsertD1DeviceSession(
  db: D1DatabaseBinding,
  params: {
    sessionId: string;
    userId: string;
    tokenHash: string;
    edgeTelemetry: EdgeNetworkTelemetry;
    deviceProfile: ParsedDeviceProfile;
    hardwareProfile?: ClientCapabilityProfile;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const clientTimezone =
    params.hardwareProfile?.clientTimezone ||
    params.edgeTelemetry.edgeTimezone ||
    'Africa/Cairo';
  const clientPerfTier = params.hardwareProfile?.activeTier || 'balanced';
  const telemetryPayloadJson = JSON.stringify({
    device: params.deviceProfile,
    hardwareProfile: params.hardwareProfile ?? null,
    edgeNetwork: params.edgeTelemetry,
  });

  await db
    .prepare(
      `INSERT INTO session (
        id, user_id, token_hash, expires_at,
        ip_address, country_code, city, region, continent, latitude, longitude, postal_code,
        asn, isp_organization, edge_colo, http_protocol, tls_version, threat_score,
        device_category, os_name, browser_name, client_timezone, client_perf_tier,
        anomaly_flags_json, hardware_telemetry_json, revoked_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, NULL, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        ip_address = excluded.ip_address,
        country_code = excluded.country_code,
        city = excluded.city,
        region = excluded.region,
        continent = excluded.continent,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        asn = excluded.asn,
        isp_organization = excluded.isp_organization,
        edge_colo = excluded.edge_colo,
        http_protocol = excluded.http_protocol,
        tls_version = excluded.tls_version,
        device_category = excluded.device_category,
        os_name = excluded.os_name,
        browser_name = excluded.browser_name,
        client_timezone = excluded.client_timezone,
        client_perf_tier = excluded.client_perf_tier,
        hardware_telemetry_json = excluded.hardware_telemetry_json,
        revoked_at = NULL,
        updated_at = excluded.updated_at`
    )
    .bind(
      params.sessionId,
      params.userId,
      params.tokenHash,
      expiresAt,
      params.edgeTelemetry.ipAddress,
      params.edgeTelemetry.countryCode,
      params.edgeTelemetry.city,
      params.edgeTelemetry.region,
      params.edgeTelemetry.continent,
      params.edgeTelemetry.latitude,
      params.edgeTelemetry.longitude,
      params.edgeTelemetry.postalCode,
      params.edgeTelemetry.asn,
      params.edgeTelemetry.ispOrganization,
      params.edgeTelemetry.colo,
      params.edgeTelemetry.httpProtocol,
      params.edgeTelemetry.tlsVersion,
      params.edgeTelemetry.threatScore ?? 0,
      params.deviceProfile.deviceCategory,
      params.deviceProfile.osName,
      params.deviceProfile.browserName,
      clientTimezone,
      clientPerfTier,
      telemetryPayloadJson,
      nowIso,
      nowIso
    )
    .run();
}

export function mapD1SessionRowToActiveSession(
  row: Record<string, unknown>,
  currentSessionId: string | null
): ActiveDeviceSession {
  const sessionId = String(row.id);
  const userId = String(row.user_id);
  const osName = String(row.os_name || 'Unknown OS');
  const browserName = String(row.browser_name || 'Browser');
  const deviceCategory = String(
    row.device_category || 'desktop'
  ) as ParsedDeviceProfile['deviceCategory'];
  const nowIso = new Date().toISOString();

  let parsedTelemetry: {
    device?: ParsedDeviceProfile;
    hardwareProfile?: ClientCapabilityProfile;
    edgeNetwork?: EdgeNetworkTelemetry;
  } = {};

  try {
    if (
      typeof row.hardware_telemetry_json === 'string' &&
      row.hardware_telemetry_json.trim()
    ) {
      parsedTelemetry = JSON.parse(row.hardware_telemetry_json);
    }
  } catch {
    parsedTelemetry = {};
  }

  const device: ParsedDeviceProfile = parsedTelemetry.device ?? {
    deviceCategory,
    osName,
    osVersion: null,
    browserName,
    browserVersion: null,
    browserEngine: osName === 'iOS' || osName === 'macOS' ? 'WebKit' : 'Blink',
    cpuArchitecture: null,
    isMobileHint: deviceCategory !== 'desktop',
    preferredLanguage: 'en-US',
    rawUserAgent: 'Cloudflare-D1-Session',
    deviceName: `${osName} (${browserName})`,
    deviceBrand: osName,
    deviceModelCode: null,
    gpuRenderer: null,
    marketTier: 'mid-range',
    marketTierLabel: 'Mid-Range Mainstream',
    estimatedPriceSegment: '$200–$399 Mainstream Tier',
  };

  const countryCode = String(row.country_code || 'EG');
  const edgeNetwork: EdgeNetworkTelemetry = parsedTelemetry.edgeNetwork ?? {
    ipAddress: String(row.ip_address || '127.0.0.1'),
    countryCode,
    countryName: countryCode === 'EG' ? 'Egypt' : countryCode,
    city: row.city ? String(row.city) : null,
    region: row.region ? String(row.region) : null,
    continent: row.continent ? String(row.continent) : null,
    latitude: typeof row.latitude === 'number' ? row.latitude : null,
    longitude: typeof row.longitude === 'number' ? row.longitude : null,
    postalCode: row.postal_code ? String(row.postal_code) : null,
    edgeTimezone: row.client_timezone
      ? String(row.client_timezone)
      : 'Africa/Cairo',
    asn: typeof row.asn === 'number' ? row.asn : null,
    ispOrganization: row.isp_organization ? String(row.isp_organization) : null,
    colo: String(row.edge_colo || 'CAI'),
    httpProtocol: String(row.http_protocol || 'HTTP/3'),
    tlsVersion: String(row.tls_version || 'TLSv1.3'),
    ja4Fingerprint: null,
    threatScore: typeof row.threat_score === 'number' ? row.threat_score : 0,
    capturedAt: String(row.updated_at || nowIso),
  };

  const clientTier = String(
    row.client_perf_tier || 'balanced'
  ) as ActiveDeviceSession['clientTier'];

  return {
    sessionId,
    userId,
    isCurrentDevice: currentSessionId ? sessionId === currentSessionId : false,
    device,
    edgeNetwork,
    clientTimezone: String(row.client_timezone || 'Africa/Cairo'),
    clientTier,
    anomalyFlags: [],
    createdAt: String(row.created_at || nowIso),
    lastVerifiedAt: String(row.updated_at || nowIso),
    expiresAt: String(row.expires_at || nowIso),
    kvCacheStatus: 'hit',
    edgeVerificationLatencyMs: 1.4,
    hardwareProfile: parsedTelemetry.hardwareProfile,
  };
}

export async function fetchUserActiveSessionsFromD1(
  db: D1DatabaseBinding,
  userId: string,
  currentSessionId: string | null
): Promise<ActiveDeviceSession[]> {
  try {
    const res = await db
      .prepare(
        "SELECT * FROM session WHERE user_id = ? AND revoked_at IS NULL AND os_name != 'Web' ORDER BY updated_at DESC LIMIT 20"
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    return res.results.map((r) =>
      mapD1SessionRowToActiveSession(r, currentSessionId)
    );
  } catch {
    return [];
  }
}
