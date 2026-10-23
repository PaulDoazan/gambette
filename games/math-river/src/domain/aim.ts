import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  HOLE_RADIUS,
  MAX_RANGE,
  MAX_STRETCH,
  MID_Y,
  MIN_STRETCH,
} from '../config/dimensions';
import type { Vec } from './types';

export interface Aim {
  /** Étirement (px), plafonné à MAX_STRETCH. */
  stretch: number;
  /** Portée au sol (px), proportionnelle à l'étirement. */
  range: number;
  /** Point d'impact de l'eau. */
  target: Vec;
}

/** Position du seau tenu : le doigt, à au plus MAX_STRETCH de sa place et dans le plateau. */
export function clampGrip(home: Vec, p: Vec): Vec {
  const dx = p.x - home.x;
  const dy = p.y - home.y;
  const d = Math.hypot(dx, dy);
  const k = d > MAX_STRETCH ? MAX_STRETCH / d : 1;
  return {
    x: Math.min(DESIGN_WIDTH, Math.max(0, home.x + dx * k)),
    y: Math.min(DESIGN_HEIGHT, Math.max(0, home.y + dy * k)),
  };
}

/**
 * Visée d'un seau tiré de `home` jusqu'à `grip` : l'eau part à l'opposé de la traction, d'autant
 * plus loin que le seau est tiré. Null sous MIN_STRETCH (le seau revient sans tirer).
 */
export function aimFrom(home: Vec, grip: Vec): Aim | null {
  const dx = grip.x - home.x;
  const dy = grip.y - home.y;
  const d = Math.hypot(dx, dy);
  if (d < MIN_STRETCH) return null;
  const stretch = Math.min(d, MAX_STRETCH);
  const range = (stretch / MAX_STRETCH) * MAX_RANGE;
  return { stretch, range, target: { x: home.x - (dx / d) * range, y: home.y - (dy / d) * range } };
}

/** Position au sol et hauteur relative (0 → 1 → 0) de l'eau à `t` ∈ [0, 1] de son vol. */
export function flightAt(from: Vec, to: Vec, t: number): Vec & { lift: number } {
  const u = Math.min(1, Math.max(0, t));
  return {
    x: from.x + (to.x - from.x) * u,
    y: from.y + (to.y - from.y) * u,
    lift: Math.sin(Math.PI * u),
  };
}

/** Centre du trou (milieu du plateau, lu à l'appel : la hauteur dépend de l'écran). */
export const holeCenter = (): Vec => ({ x: DESIGN_WIDTH / 2, y: MID_Y });

/** L'eau tombée en `p` est-elle dans le trou ? */
export function inHole(p: Vec): boolean {
  const c = holeCenter();
  return Math.hypot(p.x - c.x, p.y - c.y) <= HOLE_RADIUS;
}
