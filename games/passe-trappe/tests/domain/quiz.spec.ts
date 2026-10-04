import { describe, it, expect } from 'vitest';
import { computeAnswer, mulberry32, type Pair } from '@gambette/math-sdk';
import { labelCamp, pickCalc } from '../../src/domain/quiz';

const P68: Pair = { a: 6, b: 8, op: 'mul' };
const P74: Pair = { a: 7, b: 4, op: 'mul' };

describe('labelCamp', () => {
  it('une seule bonne réponse, valeurs toutes distinctes', () => {
    for (const n of [1, 2, 5, 10, 20]) {
      const l = labelCamp(P68, n, mulberry32(n))!;
      expect(l.values).toHaveLength(n);
      expect(l.values.filter((v) => v === 48)).toHaveLength(1);
      expect(l.values[l.correctIndex]).toBe(48);
      expect(new Set(l.values).size).toBe(n);
    }
  });

  it('mauvaises réponses proches de la bonne (difficulté moyenne)', () => {
    const l = labelCamp(P68, 5, mulberry32(7))!;
    for (const v of l.values) if (v !== 48) expect(Math.abs(v - 48)).toBeLessThanOrEqual(9);
  });

  it('camp à un palet : la bonne réponse ; camp vide : rien', () => {
    expect(labelCamp(P68, 1, mulberry32(1))).toEqual({ correctIndex: 0, values: [48] });
    expect(labelCamp(P68, 0, mulberry32(1))).toBeNull();
  });

  it('déterministe à rng égal', () => {
    expect(labelCamp(P74, 6, mulberry32(42))).toEqual(labelCamp(P74, 6, mulberry32(42)));
  });

  it('la bonne réponse correspond au calcul', () => {
    const l = labelCamp(P74, 4, mulberry32(3))!;
    expect(l.values[l.correctIndex]).toBe(computeAnswer(P74));
  });
});

describe('pickCalc', () => {
  it('évite le calcul précédent quand il y a le choix', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) expect(pickCalc([P68, P74], P68, rng)).toEqual(P74);
  });

  it('un seul calcul disponible : on le reprend', () => {
    expect(pickCalc([P68], P68, mulberry32(1))).toEqual(P68);
  });
});
