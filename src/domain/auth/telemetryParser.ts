import type {
  EdgeNetworkTelemetry,
  ParsedDeviceProfile,
  DeviceCategory,
} from './types.ts';

export interface HttpRequestContext {
  readonly headers: { get(name: string): string | null };
  readonly cf?: Readonly<Record<string, unknown>>;
}

export interface IEdgeTelemetryParser {
  extractNetworkTelemetry(req: HttpRequestContext, nowIso?: string): EdgeNetworkTelemetry;
  parseDeviceProfile(req: HttpRequestContext): ParsedDeviceProfile;
}

/**
 * Domain Service: Extracts 0ms edge network, geo, and client header intelligence.
 * Handles production Cloudflare Workers request.cf as well as local development fallbacks.
 */
export class EdgeTelemetryParserService implements IEdgeTelemetryParser {
  public extractNetworkTelemetry(
    req: HttpRequestContext,
    nowIso: string = new Date().toISOString()
  ): EdgeNetworkTelemetry {
    const cf = req.cf;
    const ipAddress =
      req.headers.get('CF-Connecting-IP') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      '127.0.0.1';

    if (!cf) {
      // Local development or simulated fallback
      return {
        ipAddress,
        countryCode: 'DEV',
        countryName: 'Local Development Environment',
        city: 'Localhost',
        region: 'Dev Region',
        continent: 'NA',
        latitude: null,
        longitude: null,
        postalCode: null,
        edgeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        asn: 0,
        ispOrganization: 'Cloudflare Localhost Tunnel',
        colo: 'LOCAL',
        httpProtocol: 'HTTP/2',
        tlsVersion: 'TLSv1.3',
        ja4Fingerprint: null,
        threatScore: 0,
        capturedAt: nowIso,
      };
    }

    const countryCode = typeof cf.country === 'string' && cf.country.length === 2 ? cf.country : 'DEV';
    const countryName = typeof cf.countryName === 'string' ? cf.countryName : (countryCode === 'EG' ? 'Egypt' : countryCode);
    const city = typeof cf.city === 'string' ? cf.city : null;
    const region = typeof cf.region === 'string' ? cf.region : null;
    const continent = typeof cf.continent === 'string' ? cf.continent : null;
    const latitude = typeof cf.latitude === 'number' ? cf.latitude : null;
    const longitude = typeof cf.longitude === 'number' ? cf.longitude : null;
    const postalCode = typeof cf.postalCode === 'string' ? cf.postalCode : null;
    const edgeTimezone = typeof cf.timezone === 'string' ? cf.timezone : null;
    const asn = typeof cf.asn === 'number' ? cf.asn : null;
    const ispOrganization = typeof cf.asOrganization === 'string' ? cf.asOrganization : null;
    const colo = typeof cf.colo === 'string' ? cf.colo : 'CFE';
    const httpProtocol = typeof cf.httpProtocol === 'string' ? cf.httpProtocol : 'HTTP/3';
    const tlsVersion = typeof cf.tlsVersion === 'string' ? cf.tlsVersion : 'TLSv1.3';
    const threatScore = typeof cf.threatScore === 'number' ? cf.threatScore : null;

    return {
      ipAddress,
      countryCode,
      countryName,
      city,
      region,
      continent,
      latitude,
      longitude,
      postalCode,
      edgeTimezone,
      asn,
      ispOrganization,
      colo,
      httpProtocol,
      tlsVersion,
      ja4Fingerprint: null,
      threatScore,
      capturedAt: nowIso,
    };
  }

  public parseDeviceProfile(req: HttpRequestContext): ParsedDeviceProfile {
    const rawUserAgent = req.headers.get('user-agent') ?? 'Unknown-Client';
    const secChUaPlatform = req.headers.get('sec-ch-ua-platform')?.replace(/"/g, '');
    const secChUaMobile = req.headers.get('sec-ch-ua-mobile') === '?1';
    const preferredLanguage = req.headers.get('accept-language')?.split(',')[0]?.trim() ?? 'en-US';

    // 1. Determine OS Name & Version
    let osName = secChUaPlatform ?? 'Unknown OS';
    let osVersion: string | null = null;

    if (!secChUaPlatform) {
      if (/iPhone|iPad|iPod/.test(rawUserAgent)) {
        osName = /iPad/.test(rawUserAgent) ? 'iPadOS' : 'iOS';
      } else if (/Macintosh|Mac OS X/.test(rawUserAgent)) {
        osName = 'macOS';
      } else if (/Android/.test(rawUserAgent)) {
        osName = 'Android';
      } else if (/Windows/.test(rawUserAgent)) {
        osName = 'Windows';
      } else if (/Linux/.test(rawUserAgent)) {
        osName = 'Linux';
      }
    }

    // 2. Determine Browser Name & Engine
    let browserName = 'Browser';
    let browserVersion: string | null = null;
    let browserEngine: 'WebKit' | 'Blink' | 'Gecko' | 'Unknown' = 'Unknown';

    if (/Chrome|CriOS/.test(rawUserAgent) && !/Edg|OPR/.test(rawUserAgent)) {
      browserName = 'Chrome';
      browserEngine = 'Blink';
    } else if (/Safari/.test(rawUserAgent) && !/Chrome|CriOS|Edg/.test(rawUserAgent)) {
      browserName = 'Safari';
      browserEngine = 'WebKit';
    } else if (/Firefox|FxiOS/.test(rawUserAgent)) {
      browserName = 'Firefox';
      browserEngine = 'Gecko';
    } else if (/Edg/.test(rawUserAgent)) {
      browserName = 'Edge';
      browserEngine = 'Blink';
    }

    // 3. Determine Device Category
    let deviceCategory: DeviceCategory = 'desktop';
    if (secChUaMobile || /Mobile|Android|iPhone/.test(rawUserAgent)) {
      deviceCategory = 'mobile';
    } else if (/iPad|Tablet/.test(rawUserAgent)) {
      deviceCategory = 'tablet';
    } else if (/bot|crawler|spider/i.test(rawUserAgent)) {
      deviceCategory = 'bot';
    }

    return {
      deviceCategory,
      osName,
      osVersion,
      browserName,
      browserVersion,
      browserEngine,
      cpuArchitecture: req.headers.get('sec-ch-ua-arch')?.replace(/"/g, '') ?? null,
      isMobileHint: secChUaMobile,
      preferredLanguage,
      rawUserAgent,
    };
  }
}

export const edgeTelemetryParser = new EdgeTelemetryParserService();
export const extractEdgeNetworkTelemetry = (req: HttpRequestContext, nowIso?: string): EdgeNetworkTelemetry =>
  edgeTelemetryParser.extractNetworkTelemetry(req, nowIso);
export const parseDeviceHeaderProfile = (req: HttpRequestContext): ParsedDeviceProfile =>
  edgeTelemetryParser.parseDeviceProfile(req);
