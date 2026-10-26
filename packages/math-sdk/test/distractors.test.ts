import { describe, it, expect } from 'vitest';
import { generateDistractors, type Difficulty } from '../src/domain/distractors';
import { mulberry32 } from '../src/domain/rng';

const distancesFrom = (answer: number, distractors: number[]) =>
  distractors.map((d) => Math.abs(d - answer));

describe('generateDistractors basic shape', () => {
  it('returns 3 distinct distractors that exclude the answer', () => {
    const ds = generateDistractors(56, 'medium', 3, mulberry32(1));
    expect(ds).toHaveLength(3);
    expect(new Set(ds).size).toBe(3);
    expect(ds).not.toContain(56);
  });
});

describe('generateDistractors easy difficulty', () => {
  it('every distance ≥ 10', () => {
    const ds = generateDistractors(56, 'easy', 3, mulberry32(2));
    for (const d of distancesFrom(56, ds)) expect(d).toBeGreaterThanOrEqual(10);
  });
});

describe('generateDistractors medium difficulty', () => {
  it('every distance ∈ [3, 9]', () => {
    const ds = generateDistractors(56, 'medium', 3, mulberry32(3));
    for (const d of distancesFrom(56, ds)) {
      expect(d).toBeGreaterThanOrEqual(3);
      expect(d).toBeLessThanOrEqual(9);
    }
  });
});

describe('generateDistractors hard difficulty', () => {
  it('every distance ∈ [1, 5] with at least one ±1 neighbour', () => {
    const ds = generateDistractors(56, 'hard', 3, mulberry32(4));
    for (const d of distancesFrom(56, ds)) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(5);
    }
    expect(distancesFrom(56, ds)).toContain(1);
  });
});

describe('generateDistractors range constraints', () => {
  it('all distractors are positive integers in [2, 100]', () => {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    for (const diff of difficulties) {
      for (let seed = 1; seed < 30; seed++) {
        const ds = generateDistractors(56, diff, 3, mulberry32(seed));
        for (const d of ds) {
          expect(Number.isInteger(d)).toBe(true);
          expect(d).toBeGreaterThanOrEqual(2);
          expect(d).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('falls back to a wider range if not enough candidates exist (small answer, easy)', () => {
    // answer = 4 ; easy needs distance ≥ 10 → only candidates ≥ 14
    const ds = generateDistractors(4, 'easy', 3, mulberry32(5));
    expect(ds).toHaveLength(3);
    expect(new Set(ds).size).toBe(3);
  });
});

describe('generateDistractors determinism', () => {
  it('is deterministic for a given seed', () => {
    const a = generateDistractors(72, 'medium', 3, mulberry32(11));
    const b = generateDistractors(72, 'medium', 3, mulberry32(11));
    expect(a).toEqual(b);
  });
});

describe('generateDistractors petites réponses (soustractions ≤ 1)', () => {
  // Sans distracteur plus petit, la réponse serait la seule valeur < 2 (ou la
  // seule négative) : trouvable par élimination, sans calculer.
  it.each([-6, 0, 1])('réponse %i : au moins un distracteur plus petit', (answer) => {
    for (let seed = 1; seed <= 20; seed++) {
      const ds = generateDistractors(answer, 'medium', 4, mulberry32(seed));
      expect(ds).toHaveLength(4);
      expect(ds.some((d) => d < answer)).toBe(true);
      for (const d of distancesFrom(answer, ds)) {
        expect(d).toBeGreaterThanOrEqual(3);
        expect(d).toBeLessThanOrEqual(9);
      }
    }
  });
});

describe('generateDistractors au-delà de 100', () => {
  it('reste proche d’une grande réponse (addition à 2 chiffres)', () => {
    const ds = generateDistractors(178, 'medium', 4, mulberry32(5));
    expect(ds).toHaveLength(4);
    for (const d of distancesFrom(178, ds)) {
      expect(d).toBeGreaterThanOrEqual(3);
      expect(d).toBeLessThanOrEqual(9);
    }
  });
});
