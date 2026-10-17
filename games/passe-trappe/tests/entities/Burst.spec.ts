import { describe, it, expect } from 'vitest';
import { BURST_MS, burstFrame } from '../../src/entities/Burst';

describe('burstFrame — éclat d’un chiffre qui change', () => {
  it('part de l’état normal', () => {
    const f = burstFrame(0);
    expect(f.scale).toBeCloseTo(1);
    expect(f.glow).toBeCloseTo(0);
  });

  it('gonfle franchement et passe à la couleur d’éclat au premier quart', () => {
    const f = burstFrame(0.25);
    expect(f.scale).toBeGreaterThanOrEqual(1.4);
    expect(f.glow).toBeCloseTo(1);
  });

  it('les rayons s’éloignent et s’estompent', () => {
    expect(burstFrame(0.8).rays.radius).toBeGreaterThan(burstFrame(0.2).rays.radius);
    expect(burstFrame(0.8).rays.alpha).toBeLessThan(burstFrame(0.2).rays.alpha);
  });

  it('revient exactement à l’état normal à la fin (et au-delà)', () => {
    for (const t of [1, 1.5]) {
      const f = burstFrame(t);
      expect(f.scale).toBe(1);
      expect(f.glow).toBe(0);
      expect(f.rays.alpha).toBe(0);
    }
  });

  it('dure assez pour être vu, sans gêner le jeu', () => {
    expect(BURST_MS).toBeGreaterThanOrEqual(400);
    expect(BURST_MS).toBeLessThanOrEqual(800);
  });
});
