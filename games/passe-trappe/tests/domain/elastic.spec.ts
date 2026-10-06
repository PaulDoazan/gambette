import { describe, it, expect } from 'vitest';
import { contactPoint, elasticLine, launchVelocity, stretchOf } from '../../src/domain/elastic';
import {
  DESIGN_HEIGHT,
  ELASTIC_INSET,
  MAX_STRETCH,
  PUCK_RADIUS as R,
} from '../../src/config/dimensions';
import { LAUNCH_POWER } from '../../src/config/physics';

const A = elasticLine('A');
const B = elasticLine('B');
/** Centre d'un palet dont le bord étire l'élastique de `s` px. */
const atA = (s: number, x = 360) => ({ x, y: A.y - R + s });
const atB = (s: number, x = 360) => ({ x, y: B.y + R - s });

describe('elasticLine', () => {
  it('A en bas, B en haut, en retrait du bord', () => {
    expect(A.y).toBe(DESIGN_HEIGHT - ELASTIC_INSET);
    expect(B.y).toBe(ELASTIC_INSET);
    expect(A.left.x).toBe(0);
    expect(A.right.x).toBe(720);
  });
});

describe('contactPoint', () => {
  it('bord du palet côté joueur', () => {
    expect(contactPoint({ x: 100, y: 900 }, 'A')).toEqual({ x: 100, y: 900 + R });
    expect(contactPoint({ x: 100, y: 300 }, 'B')).toEqual({ x: 100, y: 300 - R });
  });
});

describe('stretchOf (depuis le bord du palet)', () => {
  it('nul tant que le bord n’a pas passé l’élastique', () => {
    expect(stretchOf(atA(-10), A, 'A')).toBe(0);
    expect(stretchOf(atA(0), A, 'A')).toBe(0);
    expect(stretchOf(atB(-10), B, 'B')).toBe(0);
  });

  it('distance du bord au-delà de l’élastique', () => {
    expect(stretchOf(atA(40), A, 'A')).toBe(40);
    expect(stretchOf(atB(40), B, 'B')).toBe(40);
  });

  it('le centre peut être devant l’élastique alors que le bord l’étire', () => {
    const p = atA(20);
    expect(p.y).toBeLessThan(A.y);
    expect(stretchOf(p, A, 'A')).toBe(20);
  });
});

describe('launchVelocity', () => {
  it('élastique non tendu → aucun lancer', () => {
    expect(launchVelocity(atA(-5), A, 'A')).toBeNull();
    expect(launchVelocity(atA(2), A, 'A')).toBeNull();
  });

  it('tir centré : droit vers le trou (A vers le haut, B vers le bas)', () => {
    const va = launchVelocity(atA(60), A, 'A')!;
    expect(va.x).toBeCloseTo(0, 6);
    expect(va.y).toBeLessThan(0);
    const vb = launchVelocity(atB(60), B, 'B')!;
    expect(vb.x).toBeCloseTo(0, 6);
    expect(vb.y).toBeGreaterThan(0);
  });

  it('palet décalé à droite : vise en diagonale vers la gauche', () => {
    const v = launchVelocity(atA(60, 520), A, 'A')!;
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it('norme proportionnelle à l’étirement, plafonnée à MAX_STRETCH', () => {
    const n = (s: number) => {
      const v = launchVelocity(atA(s), A, 'A')!;
      return Math.hypot(v.x, v.y);
    };
    expect(n(40)).toBeCloseTo(40 * LAUNCH_POWER, 3);
    expect(n(80)).toBeCloseTo(2 * n(40), 3);
    expect(n(MAX_STRETCH + 200)).toBeCloseTo(MAX_STRETCH * LAUNCH_POWER, 3);
  });
});
