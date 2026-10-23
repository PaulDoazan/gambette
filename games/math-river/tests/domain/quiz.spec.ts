import { describe, it, expect } from 'vitest';
import { mulberry32, type Pair } from '@gambette/math-sdk';
import { labelBuckets, pickCalc } from '../../src/domain/quiz';

const P68: Pair = { a: 6, b: 8, op: 'mul' };

describe('labelBuckets', () => {
  it('5 seaux : une seule bonne réponse, valeurs distinctes', () => {
    for (let seed = 1; seed < 20; seed++) {
      const l = labelBuckets(P68, 5, mulberry32(seed))!;
      expect(l.values).toHaveLength(5);
      expect(l.values.filter((v) => v === 48)).toHaveLength(1);
      expect(l.values[l.correctIndex]).toBe(48);
      expect(new Set(l.values).size).toBe(5);
    }
  });
});

describe('pickCalc', () => {
  it('évite le calcul précédent quand il y a le choix', () => {
    const pairs: Pair[] = [P68, { a: 7, b: 4, op: 'mul' }];
    for (let seed = 1; seed < 10; seed++)
      expect(pickCalc(pairs, P68, mulberry32(seed))).not.toBe(P68);
  });
});
