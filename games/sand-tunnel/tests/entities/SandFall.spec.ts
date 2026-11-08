import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@gambette/math-sdk';
import { SAND_FALL_MS, createSandFall } from '../../src/entities/SandFall';

describe('SandFall', () => {
  it('le tas se forme sur le galet, puis disparaît au bout de SAND_FALL_MS', () => {
    const fall = createSandFall({ x: 200, y: 300 }, 50, mulberry32(1));
    expect(fall.view.position).toMatchObject({ x: 200, y: 300 });
    expect(fall.update(SAND_FALL_MS / 2)).toBe(true);
    expect(fall.view.alpha).toBe(1);
    expect(fall.update(SAND_FALL_MS / 2)).toBe(false);
    expect(fall.view.alpha).toBe(0);
  });
});
