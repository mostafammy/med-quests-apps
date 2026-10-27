import type {
  ClientCapabilityProfile,
  EffectiveNetworkType,
  PerformanceTier,
  PerformanceOverrideMode,
} from '../../domain/auth/types.ts';
import { computePerformanceTier } from '../../domain/auth/hardwareTier.ts';

export interface IClientCapabilityProbe {
  probe(overrideMode?: PerformanceOverrideMode): ClientCapabilityProfile;
  probeAsync(overrideMode?: PerformanceOverrideMode): Promise<ClientCapabilityProfile>;
  bindAdaptiveCompositorAttributes(profile: ClientCapabilityProfile): () => void;
}

interface NetworkInformationLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?(type: string, listener: () => void): void;
  removeEventListener?(type: string, listener: () => void): void;
}

interface NavigatorUADataLike {
  brands?: ReadonlyArray<{ brand: string; version: string }>;
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?(
    hints: readonly string[]
  ): Promise<{
    model?: string;
    platform?: string;
    platformVersion?: string;
    architecture?: string;
    bitness?: string;
  }>;
}

interface CachedHardwareHints {
  model: string | null;
  platformVersion: string | null;
  architecture: string | null;
}

const HINTS_STORAGE_KEY = 'medquests_client_hints_v1';

let cachedGpuInfo: { renderer: string | null; vendor: string | null } | null = null;
let cachedHighEntropyHints: CachedHardwareHints | null = null;
let pendingHighEntropyPromise: Promise<CachedHardwareHints> | null = null;

function probeWebGlGpuOnce(): { renderer: string | null; vendor: string | null } {
  if (cachedGpuInfo) return cachedGpuInfo;
  if (typeof document === 'undefined') {
    return { renderer: null, vendor: null };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) {
      cachedGpuInfo = { renderer: null, vendor: null };
      return cachedGpuInfo;
    }

    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugExt
      ? String(gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    const vendor = debugExt
      ? String(gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL) || '')
      : String(gl.getParameter(gl.VENDOR) || '');

    cachedGpuInfo = {
      renderer: renderer.trim() || null,
      vendor: vendor.trim() || null,
    };
    return cachedGpuInfo;
  } catch {
    cachedGpuInfo = { renderer: null, vendor: null };
    return cachedGpuInfo;
  }
}

function getStoredHighEntropyHints(): CachedHardwareHints {
  if (cachedHighEntropyHints) return cachedHighEntropyHints;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(HINTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedHardwareHints;
        cachedHighEntropyHints = parsed;
        return parsed;
      }
    } catch {
      // Ignore storage error
    }
  }
  return { model: null, platformVersion: null, architecture: null };
}

function triggerHighEntropyProbe(): Promise<CachedHardwareHints> {
  if (cachedHighEntropyHints?.model) {
    return Promise.resolve(cachedHighEntropyHints);
  }
  if (pendingHighEntropyPromise) {
    return pendingHighEntropyPromise;
  }

  if (typeof navigator === 'undefined') {
    return Promise.resolve({ model: null, platformVersion: null, architecture: null });
  }

  const uaData = (navigator as unknown as { userAgentData?: NavigatorUADataLike }).userAgentData;
  if (!uaData?.getHighEntropyValues) {
    return Promise.resolve(getStoredHighEntropyHints());
  }

  pendingHighEntropyPromise = uaData
    .getHighEntropyValues(['model', 'platform', 'platformVersion', 'architecture', 'bitness'])
    .then((values) => {
      const cleanModel = values.model?.trim() && values.model.trim() !== 'K' ? values.model.trim() : null;
      const result: CachedHardwareHints = {
        model: cleanModel,
        platformVersion: values.platformVersion?.trim() || null,
        architecture: values.architecture?.trim() || null,
      };
      cachedHighEntropyHints = result;
      if (typeof window !== 'undefined' && cleanModel) {
        try {
          localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(result));
        } catch {
          // Ignore quota
        }
      }
      return result;
    })
    .catch(() => getStoredHighEntropyHints())
    .finally(() => {
      pendingHighEntropyPromise = null;
    });

  return pendingHighEntropyPromise;
}

/**
 * Infrastructure Service: Probes browser hardware, GPU renderer, Client Hints, and network signals.
 * Safely guards against missing Web APIs (e.g. Safari, Firefox) and never blocks the main thread.
 */
export class ClientCapabilityProbe implements IClientCapabilityProbe {
  public probe(overrideMode: PerformanceOverrideMode = 'auto'): ClientCapabilityProfile {
    const isBrowser = typeof window !== 'undefined';
    const clientTimezone = isBrowser
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';
    const clientLocale = isBrowser ? navigator.language : 'en-US';

    // Kick off async high-entropy hint resolution in background if not yet cached
    if (isBrowser) {
      void triggerHighEntropyProbe();
    }

    // Logical CPU cores (fallback 4 if absent or restricted)
    const logicalCpuCores =
      isBrowser && typeof navigator.hardwareConcurrency === 'number'
        ? navigator.hardwareConcurrency
        : 4;

    // Device Memory in GB (Chromium/Edge API, null on Safari/Firefox)
    const navAny = isBrowser ? (navigator as unknown as { deviceMemory?: number }) : {};
    const deviceMemoryGb = typeof navAny.deviceMemory === 'number' ? navAny.deviceMemory : null;

    // Display Pixel Ratio
    const devicePixelRatio = isBrowser ? Math.max(1, window.devicePixelRatio || 1) : 1;

    // Screen Dimensions
    const screenResolution = {
      width: isBrowser ? window.screen.width : 1920,
      height: isBrowser ? window.screen.height : 1080,
      colorDepth: isBrowser ? window.screen.colorDepth : 24,
    };

    // Network Information API
    const connection: NetworkInformationLike | undefined = isBrowser
      ? (navigator as unknown as { connection?: NetworkInformationLike }).connection
      : undefined;

    let effectiveNetworkType: EffectiveNetworkType = '4g';
    if (connection?.effectiveType) {
      if (['slow-2g', '2g', '3g', '4g'].includes(connection.effectiveType)) {
        effectiveNetworkType = connection.effectiveType as EffectiveNetworkType;
      }
    }

    const downlinkMbps = typeof connection?.downlink === 'number' ? connection.downlink : null;
    const rttMs = typeof connection?.rtt === 'number' ? connection.rtt : null;
    const saveDataEnabled = Boolean(connection?.saveData);

    // Media Queries
    const prefersReducedMotion = isBrowser
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    const isTouchPrimary = isBrowser
      ? window.matchMedia('(pointer: coarse)').matches
      : false;

    // GPU & High-Entropy Client Hints
    const gpu = isBrowser ? probeWebGlGpuOnce() : { renderer: null, vendor: null };
    const hints = getStoredHighEntropyHints();

    // Compute deterministic performance tier
    const computedTier = computePerformanceTier({
      logicalCpuCores,
      deviceMemoryGb,
      effectiveNetworkType,
      saveDataEnabled,
      prefersReducedMotion,
      devicePixelRatio,
    });

    const activeTier: PerformanceTier = overrideMode === 'auto' ? computedTier : overrideMode;

    return {
      clientTimezone,
      clientLocale,
      logicalCpuCores,
      deviceMemoryGb,
      devicePixelRatio,
      screenResolution,
      effectiveNetworkType,
      downlinkMbps,
      rttMs,
      saveDataEnabled,
      prefersReducedMotion,
      isTouchPrimary,
      computedTier,
      activeTier,
      probedAt: new Date().toISOString(),
      gpuRenderer: gpu.renderer,
      gpuVendor: gpu.vendor,
      detectedModelCode: hints.model,
      detectedPlatformVersion: hints.platformVersion,
      detectedCpuArch: hints.architecture,
    };
  }

  public async probeAsync(overrideMode: PerformanceOverrideMode = 'auto'): Promise<ClientCapabilityProfile> {
    if (typeof window !== 'undefined') {
      await triggerHighEntropyProbe();
    }
    return this.probe(overrideMode);
  }

  public bindAdaptiveCompositorAttributes(profile: ClientCapabilityProfile): () => void {
    if (typeof document === 'undefined') return () => {};

    // 1. Bind to document element immediately
    document.documentElement.dataset.perfTier = profile.activeTier;
    document.documentElement.dataset.timezone = profile.clientTimezone;

    // 2. Setup listeners for live changes (reduced-motion and connection changes)
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = () => {
      const updated = this.probe();
      document.documentElement.dataset.perfTier = updated.activeTier;
    };

    motionQuery.addEventListener?.('change', handleMotionChange);

    const connection: NetworkInformationLike | undefined =
      (navigator as unknown as { connection?: NetworkInformationLike }).connection;
    const handleNetworkChange = () => {
      const updated = this.probe();
      document.documentElement.dataset.perfTier = updated.activeTier;
    };

    connection?.addEventListener?.('change', handleNetworkChange);

    return () => {
      motionQuery.removeEventListener?.('change', handleMotionChange);
      connection?.removeEventListener?.('change', handleNetworkChange);
    };
  }
}

export const clientCapabilityProbe = new ClientCapabilityProbe();
export const probeClientCapabilities = (mode?: PerformanceOverrideMode): ClientCapabilityProfile =>
  clientCapabilityProbe.probe(mode);
export const probeClientCapabilitiesAsync = (
  mode?: PerformanceOverrideMode
): Promise<ClientCapabilityProfile> => clientCapabilityProbe.probeAsync(mode);
export const bindAdaptiveCompositorAttributes = (profile: ClientCapabilityProfile): () => void =>
  clientCapabilityProbe.bindAdaptiveCompositorAttributes(profile);
