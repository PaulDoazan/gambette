import { describe, it, expect } from 'vitest';
import type { Pair } from '@gambette/math-sdk';
import { CHOICES_COUNT, createQuestionFeed, formatCalc, formatSolved } from '../src/questionFeed';

const PAIRS: Pair[] = [
  { a: 6, b: 7, op: 'mul' },
  { a: 3, b: 4, op: 'add' },
  { a: 9, b: 4, op: 'sub' },
];

describe('createQuestionFeed', () => {
  it('chaque question a 5 choix distincts dont la bonne réponse', () => {
    const feed = createQuestionFeed(PAIRS, 1);
    for (let i = 0; i < 20; i++) {
      const q = feed.next();
      expect(q.choices).toHaveLength(CHOICES_COUNT);
      expect(new Set(q.choices).size).toBe(CHOICES_COUNT);
      expect(q.choices).toContain(q.answer);
    }
  });

  it("ne pioche que dans les paires fournies, au-delà d'un lot (pas d'épuisement)", () => {
    const feed = createQuestionFeed(PAIRS, 2);
    const keys = new Set(PAIRS.map((p) => `${p.a}${p.op}${p.b}`));
    for (let i = 0; i < 130; i++) {
      const q = feed.next();
      expect(keys.has(`${q.a}${q.op}${q.b}`)).toBe(true);
    }
  });

  it('est déterministe pour une même graine', () => {
    const a = createQuestionFeed(PAIRS, 42);
    const b = createQuestionFeed(PAIRS, 42);
    for (let i = 0; i < 60; i++) expect(a.next()).toEqual(b.next());
  });

  it('soustraction à résultat négatif : 5 choix distincts contenant la réponse', () => {
    const feed = createQuestionFeed([{ a: 3, b: 9, op: 'sub' }], 3);
    const q = feed.next();
    expect(q.answer).toBe(-6);
    expect(new Set(q.choices).size).toBe(CHOICES_COUNT);
    expect(q.choices).toContain(-6);
  });
});

describe('formatCalc / formatSolved', () => {
  it('formate le calcul avec le symbole de l’opération', () => {
    expect(formatCalc({ a: 6, b: 7, op: 'mul' })).toBe('6 × 7');
    expect(formatCalc({ a: 3, b: 4, op: 'add' })).toBe('3 + 4');
    expect(formatSolved({ a: 9, b: 4, op: 'sub', answer: 5 })).toBe('9 − 4 = 5');
  });
});
