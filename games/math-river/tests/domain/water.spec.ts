import { describe, it, expect } from 'vitest';
import { createWater } from '../../src/domain/water';
import { DRAIN_PER_SECOND, MIN_LEVEL, START_LEVEL, WATER_PER_BUCKET } from '../../src/config/water';

describe('createWater', () => {
  it('démarre au niveau de départ, pas plein', () => {
    const w = createWater();
    expect(w.level()).toBe(START_LEVEL);
    expect(w.full()).toBe(false);
  });

  it('un seau fait monter le niveau', () => {
    const w = createWater(0.5);
    w.pour();
    expect(w.level()).toBeCloseTo(0.5 + WATER_PER_BUCKET);
  });

  it('l’eau s’infiltre avec le temps', () => {
    const w = createWater(0.5);
    w.update(1000);
    expect(w.level()).toBeCloseTo(0.5 - DRAIN_PER_SECOND);
  });

  it('jamais à sec : plancher MIN_LEVEL, même après une très longue attente', () => {
    const w = createWater();
    for (let i = 0; i < 600; i++) w.update(1000);
    expect(w.level()).toBe(MIN_LEVEL);
  });

  it('plafonné à 1 : plein, et l’infiltration ne compte plus', () => {
    const w = createWater(0.95);
    w.pour();
    expect(w.level()).toBe(1);
    expect(w.full()).toBe(true);
    w.update(5000);
    expect(w.full()).toBe(true);
  });

  it('reset revient au niveau de départ', () => {
    const w = createWater(0.3);
    w.pour();
    w.reset();
    expect(w.level()).toBe(0.3);
  });
});
