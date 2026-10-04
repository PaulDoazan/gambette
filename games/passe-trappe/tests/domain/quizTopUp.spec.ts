import { describe, it, expect, vi } from 'vitest';
import { mulberry32, type Pair } from '@gambette/math-sdk';

// generateDistractors ne renvoie jamais assez de valeurs en pratique : on le simule.
vi.mock('@gambette/math-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gambette/math-sdk')>();
  return { ...actual, generateDistractors: () => [1, 1, 0] };
});

const { labelCamp } = await import('../../src/domain/quiz');

describe('labelCamp : complément des mauvaises réponses', () => {
  const ZERO: Pair = { a: 1, b: 1, op: 'sub' };

  it('complète avec les entiers non négatifs les plus proches, sans doublon', () => {
    const l = labelCamp(ZERO, 6, mulberry32(9))!;
    expect(l.values[l.correctIndex]).toBe(0);
    expect(l.values.filter((v) => v === 0)).toHaveLength(1);
    expect(new Set(l.values).size).toBe(6);
    expect([...l.values].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
