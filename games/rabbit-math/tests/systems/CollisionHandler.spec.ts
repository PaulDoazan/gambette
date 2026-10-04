import { describe, it, expect } from 'vitest';
import { classifyHit } from '../../src/systems/CollisionHandler';

const aabb = { minX: 100, maxX: 160, minY: 50, maxY: 110 };

describe('classifyHit rabbit', () => {
  it("returns rabbit when point is inside the rabbit's aabb", () => {
    expect(classifyHit({ x: 130, y: 80 }, [aabb])).toEqual({ kind: 'rabbit', index: 0 });
  });
});

describe('classifyHit ground', () => {
  it('returns ground when below GROUND_Y and not in any aabb', () => {
    expect(classifyHit({ x: 30, y: 380 }, [aabb])).toEqual({ kind: 'ground' });
  });
});

describe('classifyHit none', () => {
  it('returns none when in mid-air outside any rabbit aabb', () => {
    expect(classifyHit({ x: 30, y: 30 }, [aabb])).toEqual({ kind: 'none' });
  });
});
