import { describe, it, expect } from 'vitest';
import { WATER_R_MIN } from '../../src/config/dimensions';
import { waterRadiusMax } from '../../src/config/rounds';
import { waterRadius } from '../../src/entities/Pool';

describe('waterRadius', () => {
  it('du fond au niveau du canal, à l’échelle du trou de la manche', () => {
    expect(waterRadius(0, 2)).toBe(WATER_R_MIN);
    expect(waterRadius(1, 2)).toBe(waterRadiusMax(2));
    expect(waterRadius(1, 0)).toBeLessThan(waterRadius(1, 2));
  });
});

describe('createPool', () => {
  it('fond de sable sous l’eau, surface au-dessus, repère du niveau à part', async () => {
    const { createPool } = await import('../../src/entities/Pool');
    const pool = createPool(0, 0.2);
    expect(pool.floor.children.length).toBeGreaterThan(0);
    expect(pool.marks.children.length).toBeGreaterThan(0);
    expect(pool.view.children).not.toContain(pool.marks);
    pool.ripple({ x: 360, y: 640 });
    expect(() => pool.update(0.5, 16)).not.toThrow();
  });
});
