/**
 * Pure Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Ensures reproducible sampling runs for clinical quality assurance audits
 * while falling back to Web Crypto CSPRNG when no seed is specified.
 */

export interface IRandomGenerator {
  nextFloat(): number; // [0, 1)
  nextInt(min: number, max: number): number; // inclusive min, exclusive max
}

export class Mulberry32RandomGenerator implements IRandomGenerator {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }
}

export class WebCryptoRandomGenerator implements IRandomGenerator {
  public nextFloat(): number {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    }
    return Math.random();
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }
}

export function createRandomGenerator(seed?: number): { generator: IRandomGenerator; effectiveSeed: number } {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return {
      generator: new Mulberry32RandomGenerator(seed),
      effectiveSeed: seed >>> 0,
    };
  }

  // Derive an effective seed from high-entropy source
  const array = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    array[0] = Math.floor(Math.random() * 0xffffffff);
  }
  const effectiveSeed = array[0];

  return {
    generator: new Mulberry32RandomGenerator(effectiveSeed),
    effectiveSeed,
  };
}
