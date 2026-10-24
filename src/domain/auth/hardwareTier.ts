import type {
  PerformanceTier,
  EffectiveNetworkType,
} from './types.ts';

export interface HardwareTierInputs {
  readonly logicalCpuCores: number;
  readonly deviceMemoryGb: number | null;
  readonly effectiveNetworkType: EffectiveNetworkType;
  readonly saveDataEnabled: boolean;
  readonly prefersReducedMotion: boolean;
  readonly devicePixelRatio: number;
}

export interface IHardwareTierClassifier {
  classify(inputs: HardwareTierInputs): PerformanceTier;
}

/**
 * Domain Service: Classifies device and network conditions into a performance tier.
 * Ultra: 120fps spring physics, full multi-pass specular blur, ambient orbs.
 * Balanced: 60fps GPU-composited transform/opacity, moderate blur, static orbs.
 * Low-Spec: 0 blur overdraw, high contrast solid surfaces, <70ms transitions.
 */
export class HardwareTierClassifierService implements IHardwareTierClassifier {
  public classify(inputs: HardwareTierInputs): PerformanceTier {
    // 1. Force low-spec if reduced motion is requested or data-saver is active
    if (inputs.prefersReducedMotion || inputs.saveDataEnabled) {
      return 'low-spec';
    }

    // 2. Slow cellular networks cannot sustain large dynamic asset cascades
    if (
      inputs.effectiveNetworkType === 'slow-2g' ||
      inputs.effectiveNetworkType === '2g' ||
      inputs.effectiveNetworkType === '3g'
    ) {
      return 'low-spec';
    }

    // 3. Constrained memory or CPU
    const ram = inputs.deviceMemoryGb;
    const cores = inputs.logicalCpuCores;

    if (ram !== null && ram < 4) {
      return 'low-spec';
    }
    if (cores <= 2) {
      return 'low-spec';
    }

    // 4. Ultra Tier: High-end desktop or tablet with >=8 cores and >=8GB RAM (or high-DPR Apple Silicon)
    const isHighRam = ram === null || ram >= 8;
    const isHighCores = cores >= 8;
    const isProMotionDisplay = inputs.devicePixelRatio >= 2;

    if (isHighCores && isHighRam && isProMotionDisplay) {
      return 'ultra';
    }

    // 5. Default reliable 60fps tier
    return 'balanced';
  }
}

export const hardwareTierClassifier = new HardwareTierClassifierService();
export const computePerformanceTier = (inputs: HardwareTierInputs): PerformanceTier =>
  hardwareTierClassifier.classify(inputs);
