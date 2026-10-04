import { describe, it, expect } from 'vitest';
import { mulberry32, pickFrom, shuffle, type Rng } from '../src/domain/rng';

const draws = (r: Rng, n: number) => Array.from({ length: n }, () => r());

describe('mulberry32', () => {
  it('produces identical 50-draw sequences for the same seed', () => {
    expect(draws(mulberry32(42), 50)).toEqual(draws(mulberry32(42), 50));
  });

  it('produces different sequences for different seeds', () => {
    expect(draws(mulberry32(1), 5)).not.toEqual(draws(mulberry32(2), 5));
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('pickFrom', () => {
  it('returns an element from the array', () => {
    const r = mulberry32(7);
    const result = pickFrom([10, 20, 30], r);
    expect([10, 20, 30]).toContain(result);
  });

  it('always returns the only element of a single-element array', () => {
    const r = mulberry32(7);
    expect(pickFrom(['x'], r)).toBe('x');
  });

  it('throws with an explanatory message on an empty array', () => {
    const r = mulberry32(1);
    expect(() => pickFrom([], r)).toThrow(/empty/);
  });
});

describe('shuffle', () => {
  it('returns a permutation containing the same elements', () => {
    const r = mulberry32(99);
    const out = shuffle([1, 2, 3, 4, 5], r);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the input', () => {
    const r = mulberry32(99);
    const input = [1, 2, 3];
    shuffle(input, r);
    expect(input).toEqual([1, 2, 3]);
  });
});
