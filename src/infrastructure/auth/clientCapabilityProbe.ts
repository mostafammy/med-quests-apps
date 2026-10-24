import type {
  ClientCapabilityProfile,
  EffectiveNetworkType,
  PerformanceTier,
  PerformanceOverrideMode,
} from '../../domain/auth/types.ts';
import { computePerformanceTier } from '../../domain/auth/hardwareTier.ts';

export interface IClientCapabilityProbe {
  probe(overrideMode?: PerformanceOverrideMode): ClientCapabilityProfile;
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

/**
 * Infrastructure Service: Probes browser hardware and network signals synchronously in < 0.5ms.
 * Safely guards against missing Web APIs (e.g. Safari, Firefox) and never calls deprecated fingerprinting.
 */
export class ClientCapabilityProbe implements IClientCapabilityProbe {
  public probe(overrideMode: PerformanceOverrideMode = 'auto'): ClientCapabilityProfile {
    const isBrowser = typeof window !== 'undefined';
    const clientTimezone = isBrowser
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';
    const clientLocale = isBrowser ? navigator.language : 'en-US';

    // Logical CPU cores (fallback 4 if absent or restricted)
    const logicalCpuCores = isBrowser && typeof navigator.hardwareConcurrency === 'number'
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
    };
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
export const bindAdaptiveCompositorAttributes = (profile: ClientCapabilityProfile): () => void =>
  clientCapabilityProbe.bindAdaptiveCompositorAttributes(profile);
