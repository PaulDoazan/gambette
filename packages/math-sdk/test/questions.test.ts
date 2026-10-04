import { describe, it, expect } from 'vitest';
import { generateQuestions } from '../src/domain/questions';
import { allPairs, getTableList } from '../src/domain/calcs';

describe('generateQuestions choicesCount', () => {
  it('produces exactly choicesCount choices per question', () => {
    const session = generateQuestions({
      pairs: [{ a: 4, b: 7, op: 'mul' }],
      difficulty: 'medium',
      count: 3,
      choicesCount: 6,
      seed: 1,
    });
    expect(session).toHaveLength(3);
    for (const q of session) expect(q.choices).toHaveLength(6);
  });
});

const ALL = allPairs();
const TABLE_2 = getTableList('table_2').pairs;

describe('generateQuestions', () => {
  it('returns the requested number of questions', () => {
    const qs = generateQuestions({
      pairs: ALL,
      difficulty: 'medium',
      count: 10,
      choicesCount: 4,
      seed: 1,
    });
    expect(qs).toHaveLength(10);
  });

  it('each question has answer = a × b', () => {
    const qs = generateQuestions({
      pairs: ALL,
      difficulty: 'medium',
      count: 10,
      choicesCount: 4,
      seed: 2,
    });
    for (const q of qs) expect(q.answer).toBe(q.a * q.b);
  });

  it('each question has 4 distinct choices including the answer', () => {
    const qs = generateQuestions({
      pairs: ALL,
      difficulty: 'medium',
      count: 10,
      choicesCount: 4,
      seed: 3,
    });
    for (const q of qs) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(q.answer);
    }
  });
});

describe('generateQuestions variability', () => {
  it('choices are shuffled (the answer is not always at index 0)', () => {
    const qs = generateQuestions({
      pairs: ALL,
      difficulty: 'medium',
      count: 30,
      choicesCount: 4,
      seed: 4,
    });
    const positions = qs.map((q) => q.choices.indexOf(q.answer));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it('does not repeat the same multiplication twice in a row', () => {
    const qs = generateQuestions({
      pairs: TABLE_2,
      difficulty: 'medium',
      count: 10,
      choicesCount: 4,
      seed: 1,
    });
    for (let i = 1; i < qs.length; i++) {
      const prev = qs[i - 1]!;
      const cur = qs[i]!;
      const samePair = prev.a === cur.a && prev.b === cur.b;
      expect(samePair).toBe(false);
    }
  });
});

describe('generateQuestions determinism', () => {
  it('is deterministic for the same seed', () => {
    const a = generateQuestions({
      pairs: ALL,
      difficulty: 'medium',
      count: 10,
      choicesCount: 4,
      seed: 42,
    });
    const b = generateQuestions({
      pairs: ALL,
      difficulty: 'medium',
      count: 10,
      choicesCount: 4,
      seed: 42,
    });
    expect(a).toEqual(b);
  });
});
