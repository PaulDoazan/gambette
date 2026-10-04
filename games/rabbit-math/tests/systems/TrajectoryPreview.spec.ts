import { describe, it, expect } from 'vitest';
import { computeTrajectoryPoints } from '../../src/systems/TrajectoryPreview';

describe('computeTrajectoryPoints start', () => {
  it('starts at the launch position', () => {
    const pts = computeTrajectoryPoints({ x: 100, y: 200 }, { x: 6, y: -10 });
    expect(pts[0]).toEqual({ x: 100, y: 200 });
  });
});

describe('computeTrajectoryPoints direction', () => {
  it('a positive x velocity makes the trajectory move to the right', () => {
    const pts = computeTrajectoryPoints({ x: 100, y: 200 }, { x: 8, y: -12 });
    const last = pts[pts.length - 1]!;
    expect(last.x).toBeGreaterThan(100);
  });

  it('a negative x velocity makes the trajectory move to the left', () => {
    const pts = computeTrajectoryPoints({ x: 100, y: 200 }, { x: -8, y: -12 });
    const last = pts[pts.length - 1]!;
    expect(last.x).toBeLessThan(100);
  });
});

describe('computeTrajectoryPoints shape', () => {
  it('follows a parabola: y first decreases (rises) then increases (falls)', () => {
    const pts = computeTrajectoryPoints({ x: 0, y: 200 }, { x: 4, y: -12 });
    const ys = pts.map((p) => p.y);
    const minY = Math.min(...ys);
    const minIdx = ys.indexOf(minY);
    expect(minIdx).toBeGreaterThan(0);
    expect(minIdx).toBeLessThan(ys.length - 1);
  });
});
