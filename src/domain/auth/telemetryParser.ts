import type {
  EdgeNetworkTelemetry,
  ParsedDeviceProfile,
  DeviceCategory,
  DeviceMarketTier,
  ClientCapabilityProfile,
} from './types.ts';

export interface HttpRequestContext {
  readonly headers: { get(name: string): string | null };
  readonly cf?: Readonly<Record<string, unknown>>;
}

export interface HardwareIntelligenceHints {
  readonly gpuRenderer?: string | null;
  readonly gpuVendor?: string | null;
  readonly detectedModelCode?: string | null;
  readonly detectedPlatformVersion?: string | null;
  readonly detectedCpuArch?: string | null;
  readonly logicalCpuCores?: number;
  readonly deviceMemoryGb?: number | null;
  readonly devicePixelRatio?: number;
  readonly screenWidth?: number;
  readonly screenHeight?: number;
  readonly isTouchPrimary?: boolean;
}

export interface IEdgeTelemetryParser {
  extractNetworkTelemetry(req: HttpRequestContext, nowIso?: string): EdgeNetworkTelemetry;
  parseDeviceProfile(req: HttpRequestContext, hints?: HardwareIntelligenceHints): ParsedDeviceProfile;
}

const MARKET_TIER_META: Readonly<
  Record<DeviceMarketTier, { readonly label: string; readonly priceSegment: string }>
> = {
  'flagship-luxury': {
    label: 'Flagship / Luxury',
    priceSegment: '$800+ Flagship Tier',
  },
  'upper-midrange': {
    label: 'Upper Mid-Range',
    priceSegment: '$400–$799 Upper-Mid Tier',
  },
  'mid-range': {
    label: 'Mid-Range Mainstream',
    priceSegment: '$200–$399 Mainstream Tier',
  },
  economical: {
    label: 'Economical / Budget',
    priceSegment: '<$200 Economical Tier',
  },
};

/**
 * Extracts raw Android OEM model code from a User-Agent string if not reduced to "K".
 */
function extractAndroidModelFromUa(ua: string): string | null {
  // Standard Android UA: Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A...) or (Linux; Android 13; 2312DRA50G)
  const match = ua.match(/Android\s+[\d.]+;\s*(?:[a-z]{2}-[a-z]{2};\s*)?([^;)]+?)(?:\s+Build\/[^)]*)?\)/i);
  if (!match || !match[1]) return null;
  const candidate = match[1].trim();
  // Chrome 110+ UA reduction uses single letter "K" or generic tokens
  if (
    !candidate ||
    candidate === 'K' ||
    candidate === 'Mobile' ||
    candidate === 'wv' ||
    /^Linux/i.test(candidate) ||
    /^Android/i.test(candidate)
  ) {
    return null;
  }
  return candidate;
}

/**
 * Resolves an Android model code + GPU/RAM/CPU signals into a human-readable
 * marketing name, brand, and Economic vs. Luxury Market Tier.
 */
function resolveAndroidDeviceIntelligence(
  modelCode: string | null,
  hints?: HardwareIntelligenceHints
): {
  readonly deviceBrand: string;
  readonly deviceName: string;
  readonly deviceModelCode: string | null;
  readonly marketTier: DeviceMarketTier;
} {
  const cleanModel = modelCode?.trim() || null;
  const upperModel = cleanModel?.toUpperCase() || '';
  const gpu = hints?.gpuRenderer || '';
  const ram = hints?.deviceMemoryGb ?? null;
  const cores = hints?.logicalCpuCores ?? 6;
  const dpr = hints?.devicePixelRatio ?? 2;

  // 1. Hardware-based baseline market tier from GPU, RAM, CPU & DPR
  let baselineTier: DeviceMarketTier = 'mid-range';
  if (
    /Adreno\s*\(TM\)\s*(?:7[345]\d|8\d\d)/i.test(gpu) ||
    /Xclipse\s*9[24]0/i.test(gpu) ||
    /Immortalis/i.test(gpu) ||
    /Mali-G71[05]/i.test(gpu) ||
    (ram !== null && ram >= 12)
  ) {
    baselineTier = 'flagship-luxury';
  } else if (
    /Adreno\s*\(TM\)\s*(?:6[456]\d|7[12]\d)/i.test(gpu) ||
    /Mali-G(?:68|77|78|610)/i.test(gpu) ||
    (ram !== null && ram >= 8 && cores >= 8 && dpr >= 2.6)
  ) {
    baselineTier = 'upper-midrange';
  } else if (
    /Adreno\s*\(TM\)\s*(?:5\d\d|610)/i.test(gpu) ||
    /Mali-G(?:31|52)/i.test(gpu) ||
    /PowerVR/i.test(gpu) ||
    (ram !== null && ram <= 4 && (dpr < 2.5 || cores <= 6)) ||
    cores <= 4
  ) {
    baselineTier = 'economical';
  } else if (ram !== null && ram >= 8) {
    baselineTier = 'upper-midrange';
  }

  // 2. Samsung Model Code Resolution (SM-*)
  if (upperModel.startsWith('SM-') || upperModel.startsWith('SAMSUNG')) {
    const code = upperModel.replace(/^SAMSUNG[- ]*/, '');
    if (/^SM-S928/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S24 Ultra', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    if (/^SM-S926/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S24+', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    if (/^SM-S921/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S24', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    if (/^SM-S918/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S23 Ultra', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    if (/^SM-S91[16]/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S23 Series', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    if (/^SM-S90[168]/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S22 Series', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    if (/^SM-G99/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S21 Series', deviceModelCode: code, marketTier: 'upper-midrange' };
    }
    if (/^SM-S711|^SM-S721/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy S-FE Series', deviceModelCode: code, marketTier: 'upper-midrange' };
    }
    if (/^SM-F9/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy Z Fold', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    if (/^SM-F7/.test(code)) {
      return { deviceBrand: 'Samsung', deviceName: 'Samsung Galaxy Z Flip', deviceModelCode: code, marketTier: 'flagship-luxury' };
    }
    // Galaxy A-Series (A5x / A7x = Upper Mid-Range; A2x / A3x = Mid-Range; A0x / A1x = Economical)
    const aMatch = code.match(/^SM-A(\d)(\d)/);
    if (aMatch) {
      const seriesTier = Number(aMatch[1]);
      const gen = aMatch[2];
      const modelLabel = `A${seriesTier}${gen}`;
      if (seriesTier >= 5) {
        return {
          deviceBrand: 'Samsung',
          deviceName: `Samsung Galaxy ${modelLabel}`,
          deviceModelCode: code,
          marketTier: 'upper-midrange',
        };
      }
      if (seriesTier >= 2) {
        return {
          deviceBrand: 'Samsung',
          deviceName: `Samsung Galaxy ${modelLabel}`,
          deviceModelCode: code,
          marketTier: 'mid-range',
        };
      }
      return {
        deviceBrand: 'Samsung',
        deviceName: `Samsung Galaxy ${modelLabel}`,
        deviceModelCode: code,
        marketTier: 'economical',
      };
    }
    // Galaxy M-Series
    const mMatch = code.match(/^SM-M(\d)(\d)/);
    if (mMatch) {
      const seriesTier = Number(mMatch[1]);
      const modelLabel = `M${seriesTier}${mMatch[2]}`;
      return {
        deviceBrand: 'Samsung',
        deviceName: `Samsung Galaxy ${modelLabel}`,
        deviceModelCode: code,
        marketTier: seriesTier >= 5 ? 'upper-midrange' : seriesTier >= 2 ? 'mid-range' : 'economical',
      };
    }
    return {
      deviceBrand: 'Samsung',
      deviceName: `Samsung Galaxy (${code})`,
      deviceModelCode: code,
      marketTier: baselineTier,
    };
  }

  // 3. Google Pixel
  if (/PIXEL/i.test(upperModel)) {
    const isProOrFold = /PRO|FOLD/i.test(upperModel);
    const isASeries = /PIXEL\s*\dA/i.test(upperModel);
    return {
      deviceBrand: 'Google',
      deviceName: cleanModel!.startsWith('Google') ? cleanModel! : `Google ${cleanModel}`,
      deviceModelCode: cleanModel,
      marketTier: isProOrFold ? 'flagship-luxury' : isASeries ? 'upper-midrange' : 'flagship-luxury',
    };
  }

  // 4. Xiaomi / Redmi / POCO
  if (/REDMI|POCO|XIAOMI|MI\s/i.test(upperModel) || /^\d{4}[A-Z0-9]{5,7}[CGIN]$/i.test(upperModel)) {
    const isRedmiBudget = /REDMI\s*(?:A\d|\d+C|\d+A)/i.test(upperModel) || /POCO\s*[CM]\d/i.test(upperModel);
    const isProOrF = /PRO|ULTRA|POCO\s*F/i.test(upperModel);
    const tier: DeviceMarketTier = isRedmiBudget
      ? 'economical'
      : isProOrF
      ? baselineTier === 'flagship-luxury'
        ? 'flagship-luxury'
        : 'upper-midrange'
      : baselineTier;
    const displayName =
      cleanModel && !/^\d{4}/.test(cleanModel)
        ? cleanModel.replace(/^Xiaomi\s+/i, 'Xiaomi ')
        : `Xiaomi / Redmi (${cleanModel})`;
    return {
      deviceBrand: 'Xiaomi',
      deviceName: displayName,
      deviceModelCode: cleanModel,
      marketTier: tier,
    };
  }

  // 5. Realme (RMX*)
  if (/^RMX\d+/i.test(upperModel) || /REALME/i.test(upperModel)) {
    return {
      deviceBrand: 'Realme',
      deviceName: /REALME/i.test(cleanModel || '') ? cleanModel! : `Realme (${cleanModel})`,
      deviceModelCode: cleanModel,
      marketTier: baselineTier,
    };
  }

  // 6. OPPO / OnePlus (CPH*, LE2*, NE2*, PJ*)
  if (/^CPH\d+/i.test(upperModel) || /OPPO|ONEPLUS/i.test(upperModel)) {
    const isOnePlus = /ONEPLUS|^LE2|^NE2/i.test(upperModel);
    const brand = isOnePlus ? 'OnePlus' : 'OPPO';
    return {
      deviceBrand: brand,
      deviceName: cleanModel?.toUpperCase().includes(brand.toUpperCase())
        ? cleanModel!
        : `${brand} (${cleanModel})`,
      deviceModelCode: cleanModel,
      marketTier: isOnePlus ? 'flagship-luxury' : baselineTier,
    };
  }

  // 7. Vivo / iQOO / Infinix / TECNO / Honor / Huawei
  if (/VIVO|^V2\d{3}/i.test(upperModel)) {
    return { deviceBrand: 'Vivo', deviceName: `Vivo (${cleanModel})`, deviceModelCode: cleanModel, marketTier: baselineTier };
  }
  if (/INFINIX|^X6\d{2}/i.test(upperModel)) {
    return { deviceBrand: 'Infinix', deviceName: `Infinix (${cleanModel})`, deviceModelCode: cleanModel, marketTier: baselineTier === 'mid-range' ? 'economical' : baselineTier };
  }
  if (/TECNO|^CK|^CH|^KJ|^LG\d/i.test(upperModel)) {
    return { deviceBrand: 'TECNO', deviceName: `TECNO (${cleanModel})`, deviceModelCode: cleanModel, marketTier: baselineTier === 'mid-range' ? 'economical' : baselineTier };
  }
  if (/HONOR|HUAWEI/i.test(upperModel)) {
    const brand = /HONOR/i.test(upperModel) ? 'Honor' : 'Huawei';
    return { deviceBrand: brand, deviceName: `${brand} (${cleanModel})`, deviceModelCode: cleanModel, marketTier: baselineTier };
  }

  // 8. Generic or UA-Reduced Android Device: Build descriptive hardware name
  if (cleanModel) {
    return {
      deviceBrand: 'Android OEM',
      deviceName: `Android (${cleanModel})`,
      deviceModelCode: cleanModel,
      marketTier: baselineTier,
    };
  }

  const tierWord =
    baselineTier === 'flagship-luxury'
      ? 'Flagship'
      : baselineTier === 'upper-midrange'
      ? 'Upper Mid-Range'
      : baselineTier === 'economical'
      ? 'Economical'
      : 'Mid-Range';
  const ramSpec = ram ? `${ram}GB RAM` : `${cores}-Core`;
  return {
    deviceBrand: 'Android',
    deviceName: `Android ${tierWord} Smartphone (${ramSpec})`,
    deviceModelCode: null,
    marketTier: baselineTier,
  };
}

/**
 * Resolves Apple iOS / iPadOS / macOS device marketing name and market tier.
 */
function resolveAppleDeviceIntelligence(
  osName: string,
  deviceCategory: DeviceCategory,
  hints?: HardwareIntelligenceHints
): {
  readonly deviceBrand: string;
  readonly deviceName: string;
  readonly deviceModelCode: string | null;
  readonly marketTier: DeviceMarketTier;
} {
  const gpu = hints?.gpuRenderer || '';
  const w = Math.min(hints?.screenWidth || 0, hints?.screenHeight || 0);
  const h = Math.max(hints?.screenWidth || 0, hints?.screenHeight || 0);
  const dpr = hints?.devicePixelRatio ?? 2;

  if (osName === 'macOS') {
    const mChipMatch = gpu.match(/Apple\s+(M\d+(?:\s+(?:Pro|Max|Ultra))?)/i);
    const chipLabel = mChipMatch ? `Apple ${mChipMatch[1]}` : 'Apple Silicon';
    const isMacBookPro =
      /Pro|Max|Ultra/i.test(chipLabel) ||
      h === 1512 ||
      h === 1728 ||
      h === 1624 ||
      h === 1800;
    const isMacBookAir =
      !isMacBookPro && (h === 1440 || h === 1470 || h === 1710 || /Apple M\d/i.test(chipLabel));

    const name = isMacBookPro
      ? `Apple MacBook Pro (${chipLabel})`
      : isMacBookAir
      ? `Apple MacBook Air (${chipLabel})`
      : `Apple Mac (${chipLabel})`;

    return {
      deviceBrand: 'Apple',
      deviceName: name,
      deviceModelCode: isMacBookPro ? 'MacBookPro' : 'MacBookAir',
      marketTier: 'flagship-luxury',
    };
  }

  if (osName === 'iPadOS' || deviceCategory === 'tablet') {
    const isPro = h >= 1194 || /M\d/i.test(gpu);
    return {
      deviceBrand: 'Apple',
      deviceName: isPro ? 'Apple iPad Pro' : 'Apple iPad Air / iPad',
      deviceModelCode: 'iPad',
      marketTier: isPro ? 'flagship-luxury' : 'upper-midrange',
    };
  }

  // iPhone screen geometry heuristic
  if (w === 440 && h === 956) {
    return { deviceBrand: 'Apple', deviceName: 'Apple iPhone 16 Pro Max', deviceModelCode: 'iPhone17,2', marketTier: 'flagship-luxury' };
  }
  if (w === 402 && h === 874) {
    return { deviceBrand: 'Apple', deviceName: 'Apple iPhone 16 Pro', deviceModelCode: 'iPhone17,1', marketTier: 'flagship-luxury' };
  }
  if (w === 430 && h === 932) {
    return { deviceBrand: 'Apple', deviceName: 'Apple iPhone 15/16 Pro Max / Plus', deviceModelCode: 'iPhone16,2', marketTier: 'flagship-luxury' };
  }
  if (w === 393 && h === 852) {
    return { deviceBrand: 'Apple', deviceName: 'Apple iPhone 15 / 16 Series', deviceModelCode: 'iPhone16,1', marketTier: 'flagship-luxury' };
  }
  if (w === 428 && h === 926) {
    return { deviceBrand: 'Apple', deviceName: 'Apple iPhone 13/14 Pro Max', deviceModelCode: 'iPhone14,3', marketTier: 'flagship-luxury' };
  }
  if (w === 390 && h === 844) {
    return { deviceBrand: 'Apple', deviceName: 'Apple iPhone 13 / 14', deviceModelCode: 'iPhone14,5', marketTier: 'upper-midrange' };
  }
  if (w === 414 && h === 896) {
    return {
      deviceBrand: 'Apple',
      deviceName: dpr >= 3 ? 'Apple iPhone 11 Pro Max / XS Max' : 'Apple iPhone 11 / XR',
      deviceModelCode: 'iPhone12,1',
      marketTier: dpr >= 3 ? 'upper-midrange' : 'mid-range',
    };
  }
  if (w === 375 && h === 667) {
    return { deviceBrand: 'Apple', deviceName: 'Apple iPhone SE / 8', deviceModelCode: 'iPhoneSE', marketTier: 'mid-range' };
  }

  return {
    deviceBrand: 'Apple',
    deviceName: 'Apple iPhone',
    deviceModelCode: 'iPhone',
    marketTier: 'flagship-luxury',
  };
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

  public parseDeviceProfile(
    req: HttpRequestContext,
    hints?: HardwareIntelligenceHints
  ): ParsedDeviceProfile {
    const rawUserAgent = req.headers.get('user-agent') ?? 'Unknown-Client';
    const secChUaPlatform = req.headers.get('sec-ch-ua-platform')?.replace(/"/g, '').trim();
    const secChUaPlatformVersion = req.headers.get('sec-ch-ua-platform-version')?.replace(/"/g, '').trim();
    const secChUaModel = req.headers.get('sec-ch-ua-model')?.replace(/"/g, '').trim();
    const secChUaMobile = req.headers.get('sec-ch-ua-mobile') === '?1';
    const preferredLanguage = req.headers.get('accept-language')?.split(',')[0]?.trim() ?? 'en-US';

    // 1. Determine OS Name & Version accurately (Prioritize explicit UA tokens for Android/iOS over generic Linux)
    let osName = 'Unknown OS';
    let osVersion: string | null = hints?.detectedPlatformVersion || secChUaPlatformVersion || null;

    if (/Android/i.test(rawUserAgent) || secChUaPlatform === 'Android') {
      osName = 'Android';
      const vMatch = rawUserAgent.match(/Android\s+([\d.]+)/i);
      if (vMatch && (!osVersion || osVersion === '0.0.0')) {
        osVersion = vMatch[1];
      }
    } else if (/iPad/i.test(rawUserAgent) || secChUaPlatform === 'iPadOS') {
      osName = 'iPadOS';
      const vMatch = rawUserAgent.match(/OS\s+([\d_]+)/i);
      if (vMatch) osVersion = vMatch[1].replace(/_/g, '.');
    } else if (/iPhone|iPod/i.test(rawUserAgent) || secChUaPlatform === 'iOS') {
      osName = 'iOS';
      const vMatch = rawUserAgent.match(/OS\s+([\d_]+)/i);
      if (vMatch) osVersion = vMatch[1].replace(/_/g, '.');
    } else if (/Macintosh|Mac OS X/i.test(rawUserAgent) || secChUaPlatform === 'macOS') {
      // iPadOS Desktop Mode Check: Macintosh UA + Multi-touch coarse pointer
      if (hints?.isTouchPrimary && (hints?.logicalCpuCores ?? 8) <= 10 && (hints?.screenWidth ?? 1920) <= 1366) {
        osName = 'iPadOS';
      } else {
        osName = 'macOS';
        const vMatch = rawUserAgent.match(/Mac OS X\s+([\d_.]+)/i);
        if (vMatch && !osVersion) osVersion = vMatch[1].replace(/_/g, '.');
      }
    } else if (/Windows/i.test(rawUserAgent) || secChUaPlatform === 'Windows') {
      osName = 'Windows';
      const vMatch = rawUserAgent.match(/Windows NT\s+([\d.]+)/i);
      if (vMatch && !osVersion) osVersion = vMatch[1] === '10.0' ? '10/11' : vMatch[1];
    } else if (/Linux/i.test(rawUserAgent) || secChUaPlatform === 'Linux') {
      osName = 'Linux';
    } else if (secChUaPlatform) {
      osName = secChUaPlatform;
    }

    // 2. Determine Browser Name, Version & Engine
    let browserName = 'Browser';
    let browserVersion: string | null = null;
    let browserEngine: 'WebKit' | 'Blink' | 'Gecko' | 'Unknown' = 'Unknown';

    if (/SamsungBrowser\/([\d.]+)/i.test(rawUserAgent)) {
      browserName = 'Samsung Internet';
      browserVersion = rawUserAgent.match(/SamsungBrowser\/([\d.]+)/i)?.[1] ?? null;
      browserEngine = 'Blink';
    } else if (/EdgA?\/([\d.]+)/i.test(rawUserAgent)) {
      browserName = 'Edge';
      browserVersion = rawUserAgent.match(/EdgA?\/([\d.]+)/i)?.[1]?.split('.')[0] ?? null;
      browserEngine = 'Blink';
    } else if (/OPR\/([\d.]+)/i.test(rawUserAgent)) {
      browserName = 'Opera';
      browserVersion = rawUserAgent.match(/OPR\/([\d.]+)/i)?.[1]?.split('.')[0] ?? null;
      browserEngine = 'Blink';
    } else if (/Chrome\/([\d.]+)|CriOS\/([\d.]+)/i.test(rawUserAgent)) {
      browserName = 'Chrome';
      const cMatch = rawUserAgent.match(/(?:Chrome|CriOS)\/([\d.]+)/i);
      browserVersion = cMatch?.[1]?.split('.')[0] ?? null;
      browserEngine = osName === 'iOS' || osName === 'iPadOS' ? 'WebKit' : 'Blink';
    } else if (/Firefox\/([\d.]+)|FxiOS\/([\d.]+)/i.test(rawUserAgent)) {
      browserName = 'Firefox';
      const fMatch = rawUserAgent.match(/(?:Firefox|FxiOS)\/([\d.]+)/i);
      browserVersion = fMatch?.[1]?.split('.')[0] ?? null;
      browserEngine = 'Gecko';
    } else if (/Safari\/([\d.]+)/i.test(rawUserAgent)) {
      browserName = 'Safari';
      const sMatch = rawUserAgent.match(/Version\/([\d.]+)/i);
      browserVersion = sMatch?.[1] ?? null;
      browserEngine = 'WebKit';
    }

    // 3. Determine Device Category
    let deviceCategory: DeviceCategory = 'desktop';
    if (/bot|crawler|spider/i.test(rawUserAgent)) {
      deviceCategory = 'bot';
    } else if (/iPad|Tablet|PlayBook|Silk/i.test(rawUserAgent) || osName === 'iPadOS' || (/Android/i.test(rawUserAgent) && !/Mobile/i.test(rawUserAgent))) {
      deviceCategory = 'tablet';
    } else if (secChUaMobile || /Mobile|Android|iPhone|iPod/i.test(rawUserAgent)) {
      deviceCategory = 'mobile';
    }

    const isMobileHint = secChUaMobile || deviceCategory === 'mobile' || deviceCategory === 'tablet';

    // 4. Resolve Exact Hardware Name, Brand & Economic vs. Luxury Market Tier
    const rawModelCode =
      hints?.detectedModelCode ||
      (secChUaModel && secChUaModel !== 'K' ? secChUaModel : null) ||
      extractAndroidModelFromUa(rawUserAgent);

    let deviceBrand = 'Workstation';
    let deviceName = `${osName} ${deviceCategory === 'mobile' ? 'Mobile' : 'Workstation'}`;
    let deviceModelCode: string | null = rawModelCode;
    let marketTier: DeviceMarketTier = 'mid-range';

    if (osName === 'Android') {
      const resolved = resolveAndroidDeviceIntelligence(rawModelCode, hints);
      deviceBrand = resolved.deviceBrand;
      deviceName = resolved.deviceName;
      deviceModelCode = resolved.deviceModelCode;
      marketTier = resolved.marketTier;
    } else if (osName === 'macOS' || osName === 'iOS' || osName === 'iPadOS') {
      const resolved = resolveAppleDeviceIntelligence(osName, deviceCategory, hints);
      deviceBrand = resolved.deviceBrand;
      deviceName = resolved.deviceName;
      deviceModelCode = resolved.deviceModelCode;
      marketTier = resolved.marketTier;
    } else if (osName === 'Windows' || osName === 'Linux') {
      const gpu = hints?.gpuRenderer || '';
      const ram = hints?.deviceMemoryGb ?? null;
      const cores = hints?.logicalCpuCores ?? 4;
      const isHighEndGpu = /RTX|Radeon\s+RX\s+[6789]\d\d\d|Arc\s+A7/i.test(gpu);
      if (isHighEndGpu || (ram !== null && ram >= 16 && cores >= 12)) {
        marketTier = 'flagship-luxury';
        deviceBrand = 'PC Workstation';
        deviceName = `${osName} High-Performance Workstation`;
      } else if ((ram !== null && ram >= 8) && cores >= 8) {
        marketTier = 'upper-midrange';
        deviceBrand = 'PC / Laptop';
        deviceName = `${osName} Upper-Midrange Laptop`;
      } else if ((ram !== null && ram <= 4) || cores <= 4) {
        marketTier = 'economical';
        deviceBrand = 'Budget PC';
        deviceName = `${osName} Economical Notebook`;
      } else {
        marketTier = 'mid-range';
        deviceBrand = 'PC / Laptop';
        deviceName = `${osName} Mainstream PC`;
      }
    }

    const tierMeta = MARKET_TIER_META[marketTier];
    const cpuArchitecture =
      hints?.detectedCpuArch ||
      req.headers.get('sec-ch-ua-arch')?.replace(/"/g, '') ||
      (osName === 'Android' || osName === 'iOS' || osName === 'iPadOS' || /Apple M/i.test(hints?.gpuRenderer || '')
        ? 'arm64'
        : null);

    return {
      deviceCategory,
      osName,
      osVersion,
      browserName,
      browserVersion,
      browserEngine,
      cpuArchitecture,
      isMobileHint,
      preferredLanguage,
      rawUserAgent,
      deviceName,
      deviceBrand,
      deviceModelCode,
      gpuRenderer: hints?.gpuRenderer ?? null,
      marketTier,
      marketTierLabel: tierMeta.label,
      estimatedPriceSegment: tierMeta.priceSegment,
    };
  }
}

export const edgeTelemetryParser = new EdgeTelemetryParserService();

export const extractEdgeNetworkTelemetry = (
  req: HttpRequestContext,
  nowIso?: string
): EdgeNetworkTelemetry => edgeTelemetryParser.extractNetworkTelemetry(req, nowIso);

export const parseDeviceHeaderProfile = (
  req: HttpRequestContext,
  hints?: HardwareIntelligenceHints
): ParsedDeviceProfile => edgeTelemetryParser.parseDeviceProfile(req, hints);

/**
 * Resolves a complete ParsedDeviceProfile directly on the browser client using
 * navigator.userAgent + ClientCapabilityProfile hardware signals.
 */
export function resolveBrowserDeviceProfile(
  clientProfile: ClientCapabilityProfile,
  customUserAgent?: string
): ParsedDeviceProfile {
  const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
  const ua = customUserAgent ?? (isBrowser ? navigator.userAgent : 'Mozilla/5.0');
  const lang = isBrowser ? navigator.language || 'en-US' : clientProfile.clientLocale || 'en-US';

  const mockHeaders = new Map<string, string>([
    ['user-agent', ua],
    ['accept-language', lang],
  ]);

  return edgeTelemetryParser.parseDeviceProfile(
    {
      headers: {
        get: (name: string) => mockHeaders.get(name.toLowerCase()) ?? null,
      },
    },
    {
      gpuRenderer: clientProfile.gpuRenderer,
      gpuVendor: clientProfile.gpuVendor,
      detectedModelCode: clientProfile.detectedModelCode,
      detectedPlatformVersion: clientProfile.detectedPlatformVersion,
      detectedCpuArch: clientProfile.detectedCpuArch,
      logicalCpuCores: clientProfile.logicalCpuCores,
      deviceMemoryGb: clientProfile.deviceMemoryGb,
      devicePixelRatio: clientProfile.devicePixelRatio,
      screenWidth: clientProfile.screenResolution.width,
      screenHeight: clientProfile.screenResolution.height,
      isTouchPrimary: clientProfile.isTouchPrimary,
    }
  );
}

/**
 * Generates a deterministic per-user + per-physical-device session ID so signing in
 * on an Android phone and a MacBook Air records 2 distinct linked devices for that user.
 */
export function computeDeterministicDeviceSessionId(
  userId: string,
  device: ParsedDeviceProfile,
  hardware?: {
    screenResolution?: { width: number; height: number };
    screenWidth?: number;
    screenHeight?: number;
  }
): string {
  const screenKey = hardware?.screenResolution
    ? `${hardware.screenResolution.width}x${hardware.screenResolution.height}`
    : hardware?.screenWidth && hardware?.screenHeight
      ? `${hardware.screenWidth}x${hardware.screenHeight}`
      : '0x0';

  const rawKey = [
    userId,
    device.osName,
    device.deviceCategory,
    device.deviceModelCode || device.deviceName || 'generic',
    device.browserName,
    screenKey,
  ]
    .join('|')
    .toLowerCase();

  let hash = 2166136261;
  for (let i = 0; i < rawKey.length; i++) {
    hash ^= rawKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(36);
  const cleanOs = device.osName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'dev';
  return `ses_${cleanOs}_${hex}`;
}
