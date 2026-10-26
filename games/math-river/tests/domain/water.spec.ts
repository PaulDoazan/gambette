import { describe, it, expect } from 'vitest';
import { createWater } from '../../src/domain/water';
import { MIN_LEVEL, START_LEVEL } from '../../src/config/water';
import { ROUNDS } from '../../src/config/rounds';

const R0 = ROUNDS[0]!;
const R2 = ROUNDS[2]!;

describe('createWater', () => {
  it('démarre au niveau de départ, pas plein', () => {
    const w = createWater(R0);
    expect(w.level()).toBe(START_LEVEL);
    expect(w.full()).toBe(false);
  });

  it('un seau fait monter le niveau de l’apport de la manche', () => {
    const w = createWater(R0, 0.5);
    w.pour();
    expect(w.level()).toBeCloseTo(0.5 + R0.perBucket);
  });

  it('du sable fait baisser le niveau de l’apport d’un seau de la manche', () => {
    const w = createWater(R0, 0.5);
    w.sand();
    expect(w.level()).toBeCloseTo(0.5 - R0.perBucket);
  });

  it('du sable ne fait jamais descendre l’eau sous le plancher MIN_LEVEL', () => {
    const w = createWater(R0, MIN_LEVEL + R0.perBucket / 2);
    w.sand();
    expect(w.level()).toBe(MIN_LEVEL);
  });

  it('l’eau s’infiltre avec le temps, au rythme de la manche', () => {
    const w = createWater(R0, 0.5);
    w.update(1000);
    expect(w.level()).toBeCloseTo(0.5 - R0.drainPerSecond);
  });

  it('jamais à sec : plancher MIN_LEVEL, même après une très longue attente', () => {
    const w = createWater(R0);
    for (let i = 0; i < 3600; i++) w.update(1000);
    expect(w.level()).toBe(MIN_LEVEL);
  });

  it('plafonné à 1 : plein, et l’infiltration ne compte plus', () => {
    const w = createWater(R0, 1 - R0.perBucket / 2);
    w.pour();
    expect(w.level()).toBe(1);
    expect(w.full()).toBe(true);
    w.update(5000);
    expect(w.full()).toBe(true);
  });

  it('reset revient au niveau de départ', () => {
    const w = createWater(R0, 0.3);
    w.pour();
    w.reset();
    expect(w.level()).toBe(0.3);
  });

  it('reset(manche 3) : niveau de départ et apport de la manche 3', () => {
    const w = createWater(R0);
    w.pour();
    w.reset(R2);
    expect(w.level()).toBe(START_LEVEL);
    w.pour();
    expect(w.level()).toBeCloseTo(START_LEVEL + R2.perBucket);
  });
});
