import { DRAIN_PER_SECOND, MIN_LEVEL, START_LEVEL, WATER_PER_BUCKET } from '../config/water';

export interface Water {
  /** Niveau ∈ [MIN_LEVEL, 1] ; 1 = niveau du canal. */
  level(): number;
  /** Un bon seau est tombé dans le trou. */
  pour(): void;
  /** Infiltration pendant `dtMs` ; le niveau ne descend jamais sous MIN_LEVEL. */
  update(dtMs: number): void;
  /** L'eau atteint le canal : le poisson peut s'échapper. */
  full(): boolean;
  reset(): void;
}

export function createWater(start = START_LEVEL): Water {
  let level = start;
  return {
    level: () => level,
    pour: () => {
      level = Math.min(1, level + WATER_PER_BUCKET);
    },
    update: (dtMs) => {
      // Une fois plein, l'eau s'écoule par le canal : plus d'infiltration qui compte.
      if (level >= 1) return;
      level = Math.max(MIN_LEVEL, level - (DRAIN_PER_SECOND * dtMs) / 1000);
    },
    full: () => level >= 1,
    reset: () => {
      level = start;
    },
  };
}
