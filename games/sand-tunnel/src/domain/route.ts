import type { Vec } from './types';

/** Chemins en ligne brisée : longueur, point et cap à une distance donnée, morceau de chemin. */

export const dist = (a: Vec, b: Vec): number => Math.hypot(b.x - a.x, b.y - a.y);

export function routeLength(pts: readonly Vec[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1]!, pts[i]!);
  return l;
}

/** Distance, depuis le début, du sommet `i` du chemin. */
export function lengthTo(pts: readonly Vec[], i: number): number {
  return routeLength(pts.slice(0, i + 1));
}

/** Segment contenant la distance `s` (bornée au chemin) et la position dans ce segment. */
function locate(pts: readonly Vec[], s: number): { i: number; u: number } {
  let rest = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const l = dist(pts[i - 1]!, pts[i]!);
    if (rest <= l || i === pts.length - 1) return { i, u: l === 0 ? 1 : Math.min(1, rest / l) };
    rest -= l;
  }
  return { i: 1, u: 0 };
}

export function pointAt(pts: readonly Vec[], s: number): Vec {
  if (pts.length === 1) return { ...pts[0]! };
  const { i, u } = locate(pts, s);
  const a = pts[i - 1]!;
  const b = pts[i]!;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** Cap (radians) du chemin à la distance `s`. */
export function headingAt(pts: readonly Vec[], s: number): number {
  if (pts.length < 2) return 0;
  const { i } = locate(pts, s);
  const a = pts[i - 1]!;
  const b = pts[i]!;
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Morceau du chemin entre les distances `s0` et `s1` (sommets intermédiaires compris). */
export function slice(pts: readonly Vec[], s0: number, s1: number): Vec[] {
  if (pts.length < 2 || s1 <= s0) return [];
  const out: Vec[] = [pointAt(pts, s0)];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += dist(pts[i - 1]!, pts[i]!);
    if (acc > s0 && acc < s1) out.push({ ...pts[i]! });
  }
  out.push(pointAt(pts, s1));
  return out;
}

/** Distance du point `p` au segment [a, b]. */
export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}
