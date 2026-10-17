import { describe, it, expect } from 'vitest';
import { stepBounce } from '../src/motion';

const SPEED = 9; // unités monde / seconde
const BOUND = 7.5;
const FRAME = 1 / 60; // pas nominal à 60 fps

describe('stepBounce', () => {
  it('avance de speed × dt dans le sens courant', () => {
    const { pos, forward } = stepBounce(0, 1, SPEED, BOUND, FRAME);
    expect(pos).toBeCloseTo(0.15, 10); // 9 × 1/60
    expect(forward).toBe(1);
  });

  it('inverse le sens au bord supérieur (test avant déplacement)', () => {
    const { pos, forward } = stepBounce(8, 1, SPEED, BOUND, FRAME);
    expect(forward).toBe(-1);
    expect(pos).toBeCloseTo(8 - 0.15, 10);
  });

  it('inverse le sens au bord inférieur', () => {
    const { pos, forward } = stepBounce(-8, -1, SPEED, BOUND, FRAME);
    expect(forward).toBe(1);
    expect(pos).toBeCloseTo(-8 + 0.15, 10);
  });

  it('vitesse indépendante du framerate : 1 pas de 2×dt ≡ 2 pas de dt', () => {
    const big = stepBounce(0, 1, SPEED, BOUND, 2 * FRAME);
    const s1 = stepBounce(0, 1, SPEED, BOUND, FRAME);
    const s2 = stepBounce(s1.pos, s1.forward, SPEED, BOUND, FRAME);
    expect(big.pos).toBeCloseTo(s2.pos, 10);
  });
});
