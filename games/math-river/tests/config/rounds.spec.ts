import { afterEach, describe, it, expect } from 'vitest';
import { LAST_ROUND, ROUNDS, holeCenterOf, waterRadiusMax } from '../../src/config/rounds';
import {
  CALC_BLOCK,
  CALC_BLOCK_SIZE,
  DESIGN_WIDTH,
  MID_Y,
  configureBoard,
} from '../../src/config/dimensions';

/** Allure de référence : un bon seau toutes les 3 s pour la paire. */
const duration = (k: number): number => {
  const r = ROUNDS[k]!;
  return 0.8 / (r.perBucket / 3 - r.drainPerSecond);
};

describe('manches', () => {
  afterEach(() => configureBoard(1280));

  it('trois trous de plus en plus grands', () => {
    expect(ROUNDS.map((r) => r.holeRadius)).toEqual([160, 190, 220]);
    expect(LAST_ROUND).toBe(2);
  });

  it('manche 1 réglée comme le jeu à un trou : 0,12 par seau, 0,018 infiltré par seconde', () => {
    expect(ROUNDS[0]).toMatchObject({ perBucket: 0.12, drainPerSecond: 0.018 });
  });

  it('chaque manche un peu plus longue : ≈ 36 s, 47 s puis 58 s à l’allure de référence', () => {
    [36, 47, 58].forEach((t, k) => expect(Math.abs(duration(k) - t)).toBeLessThan(2));
  });

  it('une paire trop lente (un bon seau toutes les 8 s) perd du terrain : l’infiltration presse', () => {
    for (const r of ROUNDS) expect(r.perBucket / 8).toBeLessThan(r.drainPerSecond);
  });

  it('le plus grand trou ne touche ni les calculs ni les seaux, même sur le plateau le plus court', () => {
    configureBoard(1280);
    const reach = ROUNDS[LAST_ROUND]!.holeRadius + 22;
    expect(MID_Y + reach).toBeLessThan(CALC_BLOCK.A.y - CALC_BLOCK_SIZE.h / 2);
    expect(MID_Y - reach).toBeGreaterThan(CALC_BLOCK.B.y + CALC_BLOCK_SIZE.h / 2);
  });

  it('trou k au centre de l’écran k ; eau à 22 px sous son bord au niveau du canal', () => {
    expect(holeCenterOf(2)).toEqual({ x: 2 * DESIGN_WIDTH + DESIGN_WIDTH / 2, y: MID_Y });
    expect(waterRadiusMax(1)).toBe(190 - 22);
  });
});
