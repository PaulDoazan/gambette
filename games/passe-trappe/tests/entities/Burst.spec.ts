import { describe, it, expect } from 'vitest';
import {
  BURST_MS,
  burstFrame,
  makeSparks,
  rectSparkOrigin,
  sparkAt,
} from '../../src/entities/Burst';

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

describe('étincelles', () => {
  const rng = (() => {
    let i = 0;
    return () => (i++ * 0.37) % 1;
  })();

  it('makeSparks : des étincelles réparties tout autour', () => {
    const sparks = makeSparks(10, rng);
    expect(sparks).toHaveLength(10);
    const angles = sparks.map((s) => s.angle).sort((a, b) => a - b);
    // Pas de gros trou : chaque secteur de 90° a au moins une étincelle.
    for (let q = 0; q < 4; q++)
      expect(angles.some((a) => a >= (q * Math.PI) / 2 && a < ((q + 1) * Math.PI) / 2)).toBe(true);
  });

  it('une étincelle jaillit vers l’extérieur, rapetisse et s’éteint', () => {
    const [spark] = makeSparks(1, () => 0.5);
    const early = sparkAt(spark!, 0.1);
    const late = sparkAt(spark!, 0.8);
    expect(late.distance).toBeGreaterThan(early.distance);
    expect(late.size).toBeLessThan(early.size);
    expect(late.alpha).toBeLessThan(early.alpha);
    const end = sparkAt(spark!, 1);
    expect(end.alpha).toBe(0);
    expect(end.size).toBe(0);
  });

  it('les étincelles ne vont pas toutes à la même distance (jaillissement irrégulier)', () => {
    const sparks = makeSparks(10, rng);
    const reach = new Set(sparks.map((s) => sparkAt(s, 0.9).distance.toFixed(2)));
    expect(reach.size).toBeGreaterThan(3);
  });
});

describe('étincelles — taille et pourtour', () => {
  it('assez grosses pour être vues à l’échelle d’un téléphone (≥ 8 unités)', () => {
    for (const s of makeSparks(20)) expect(s.size).toBeGreaterThanOrEqual(8);
  });

  it('cadre : les étincelles partent des 4 côtés, vers l’extérieur', () => {
    const w = 230;
    const h = 76;
    const sides = new Set<string>();
    for (const s of makeSparks(24)) {
      const o = rectSparkOrigin(s, w, h);
      const side =
        Math.abs(o.y + h / 2) < 1e-6
          ? 'haut'
          : Math.abs(o.y - h / 2) < 1e-6
            ? 'bas'
            : o.x < 0
              ? 'gauche'
              : 'droite';
      sides.add(side);
      // Direction vers l'extérieur du cadre.
      const out = { x: Math.cos(o.dir), y: Math.sin(o.dir) };
      if (side === 'haut') expect(out.y).toBeLessThan(0);
      if (side === 'bas') expect(out.y).toBeGreaterThan(0);
      if (side === 'gauche') expect(out.x).toBeLessThan(0);
      if (side === 'droite') expect(out.x).toBeGreaterThan(0);
    }
    expect(sides).toEqual(new Set(['haut', 'bas', 'gauche', 'droite']));
  });
});
