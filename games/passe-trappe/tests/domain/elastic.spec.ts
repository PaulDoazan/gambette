import { describe, it, expect } from 'vitest';
import { elasticLine, launchVelocity, stretchOf } from '../../src/domain/elastic';
import { DESIGN_HEIGHT, ELASTIC_INSET, MAX_STRETCH } from '../../src/config/dimensions';
import { LAUNCH_POWER } from '../../src/config/physics';

const A = elasticLine('A');
const B = elasticLine('B');

describe('elasticLine', () => {
  it('A en bas, B en haut, en retrait du bord', () => {
    expect(A.y).toBe(DESIGN_HEIGHT - ELASTIC_INSET);
    expect(B.y).toBe(ELASTIC_INSET);
    expect(A.left.x).toBe(0);
    expect(A.right.x).toBe(720);
  });
});

describe('stretchOf', () => {
  it('nul tant que le palet est devant l’élastique', () => {
    expect(stretchOf({ x: 360, y: A.y - 10 }, A, 'A')).toBe(0);
    expect(stretchOf({ x: 360, y: B.y + 10 }, B, 'B')).toBe(0);
  });

  it('distance au-delà de l’élastique, vers le bord du joueur', () => {
    expect(stretchOf({ x: 360, y: A.y + 40 }, A, 'A')).toBe(40);
    expect(stretchOf({ x: 360, y: B.y - 40 }, B, 'B')).toBe(40);
  });
});

describe('launchVelocity', () => {
  it('élastique non tendu → aucun lancer', () => {
    expect(launchVelocity({ x: 360, y: A.y - 5 }, A, 'A')).toBeNull();
    expect(launchVelocity({ x: 360, y: A.y + 2 }, A, 'A')).toBeNull();
  });

  it('tir centré : droit vers le trou (A vers le haut, B vers le bas)', () => {
    const va = launchVelocity({ x: 360, y: A.y + 60 }, A, 'A')!;
    expect(va.x).toBeCloseTo(0, 6);
    expect(va.y).toBeLessThan(0);
    const vb = launchVelocity({ x: 360, y: B.y - 60 }, B, 'B')!;
    expect(vb.x).toBeCloseTo(0, 6);
    expect(vb.y).toBeGreaterThan(0);
  });

  it('palet tiré vers la droite : vise en diagonale vers la gauche', () => {
    const v = launchVelocity({ x: 520, y: A.y + 60 }, A, 'A')!;
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it('norme proportionnelle à l’étirement', () => {
    const n = (s: number) =>
      Math.hypot(...Object.values(launchVelocity({ x: 360, y: A.y + s }, A, 'A')!));
    expect(n(40)).toBeCloseTo(40 * LAUNCH_POWER, 3);
    expect(n(80)).toBeCloseTo(2 * n(40), 3);
  });

  it('étirement plafonné à MAX_STRETCH', () => {
    const far = launchVelocity({ x: 360, y: A.y + MAX_STRETCH + 200 }, A, 'A')!;
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(MAX_STRETCH * LAUNCH_POWER, 3);
  });
});
