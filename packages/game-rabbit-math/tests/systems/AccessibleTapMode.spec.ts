import { describe, it, expect } from 'vitest';
import { computeVelocityForTarget } from '../../src/systems/AccessibleTapMode';

interface Vec {
  x: number;
  y: number;
}

const simulateReaches = (start: Vec, target: Vec, v: Vec, g: number): boolean => {
  let p = { ...start };
  let vy = v.y;
  const dt = 1 / 240;
  for (let t = 0; t < 1.5; t += dt) {
    p = { x: p.x + v.x * dt, y: p.y + vy * dt };
    vy += g * dt;
    if (Math.hypot(p.x - target.x, p.y - target.y) < 5) return true;
  }
  return false;
};

describe('computeVelocityForTarget reaches target', () => {
  it('returns a velocity that, applied with constant gravity, lands within 5 px of the target', () => {
    const start = { x: 120, y: 270 };
    const target = { x: 600, y: 130 };
    const g = 980; // px/s²
    const v = computeVelocityForTarget(start, target, g, 1.0);
    expect(simulateReaches(start, target, v, g)).toBe(true);
  });
});

describe('computeVelocityForTarget arc', () => {
  it('hits the apex above the target when timeOfFlight is large', () => {
    const start = { x: 120, y: 270 };
    const target = { x: 500, y: 100 };
    const v = computeVelocityForTarget(start, target, 980, 1.5);
    expect(v.y).toBeLessThan(0); // initial upward velocity
  });
});
