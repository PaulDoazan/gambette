import type { RoundSpec } from '../config/rounds';
import { MIN_LEVEL, START_LEVEL } from '../config/water';

type WaterSpec = Pick<RoundSpec, 'perBucket' | 'drainPerSecond'>;

export interface Water {
  /** Niveau ∈ [MIN_LEVEL, 1] ; 1 = niveau du canal. */
  level(): number;
  /** Un bon seau est tombé dans le trou. */
  pour(): void;
  /** Le sable d'un mauvais seau est tombé dans le trou : l'eau baisse d'autant qu'un seau l'aurait montée. */
  sand(): void;
  /** Infiltration pendant `dtMs` ; le niveau ne descend jamais sous MIN_LEVEL. */
  update(dtMs: number): void;
  /** L'eau atteint le canal : le poisson peut s'échapper. */
  full(): boolean;
  /** Niveau de départ ; avec `spec`, passe aux réglages d'une autre manche. */
  reset(spec?: WaterSpec): void;
}

export function createWater(initial: WaterSpec, start = START_LEVEL): Water {
  let spec = initial;
  let level = start;
  return {
    level: () => level,
    pour: () => {
      level = Math.min(1, level + spec.perBucket);
    },
    sand: () => {
      level = Math.max(MIN_LEVEL, level - spec.perBucket);
    },
    update: (dtMs) => {
      // Une fois plein, l'eau s'écoule par le canal : plus d'infiltration qui compte.
      if (level >= 1) return;
      level = Math.max(MIN_LEVEL, level - (spec.drainPerSecond * dtMs) / 1000);
    },
    full: () => level >= 1,
    reset: (next) => {
      if (next) spec = next;
      level = start;
    },
  };
}
