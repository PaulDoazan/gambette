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
