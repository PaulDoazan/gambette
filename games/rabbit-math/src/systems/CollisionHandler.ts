import { CARROT_GROUND_Y } from '../config/dimensions';

export interface Vec {
  x: number;
  y: number;
}
export interface Aabb {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
export type HitClassification =
  { kind: 'rabbit'; index: number } | { kind: 'ground' } | { kind: 'none' };

export function classifyHit(point: Vec, aabbs: readonly Aabb[]): HitClassification {
  for (let i = 0; i < aabbs.length; i++) {
    const b = aabbs[i]!;
    if (point.x >= b.minX && point.x <= b.maxX && point.y >= b.minY && point.y <= b.maxY) {
      return { kind: 'rabbit', index: i };
    }
  }
  return point.y >= CARROT_GROUND_Y ? { kind: 'ground' } : { kind: 'none' };
}
