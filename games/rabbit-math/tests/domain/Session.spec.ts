import { describe, it, expect } from 'vitest';
import { createSession } from '../../src/domain/Session';
import type { Question } from '@gambette/math-sdk';

const Q1: Question = { a: 7, b: 8, op: 'mul', answer: 56, choices: [48, 56, 63, 54] };
const Q2: Question = { a: 6, b: 4, op: 'mul', answer: 24, choices: [24, 28, 18, 36] };

describe('Session initial state', () => {
  it('starts at index 0, score 0, full carrots, phase=aiming', () => {
    const s = createSession({ rounds: [Q1, Q2], carrotsPerRound: 3 });
    expect(s.snapshot()).toEqual({
      currentIndex: 0,
      score: 0,
      carrotsLeft: 3,
      phase: 'aiming',
      totalRounds: 2,
    });
    expect(s.currentQuestion()).toEqual(Q1);
  });
});

describe('Session hits', () => {
  it('recordHit moves to round_over and increments score', () => {
    const s = createSession({ rounds: [Q1, Q2], carrotsPerRound: 3 });
    s.startResolving();
    s.recordHit();
    expect(s.snapshot().score).toBe(1);
    expect(s.snapshot().phase).toBe('round_over');
  });
});

describe('Session misses', () => {
  it('recordMiss with carrots remaining returns to aiming and decrements', () => {
    const s = createSession({ rounds: [Q1, Q2], carrotsPerRound: 3 });
    s.startResolving();
    s.recordMiss();
    expect(s.snapshot().carrotsLeft).toBe(2);
    expect(s.snapshot().phase).toBe('aiming');
  });

  it('recordMiss with the last carrot moves to round_over', () => {
    const s = createSession({ rounds: [Q1, Q2], carrotsPerRound: 1 });
    s.startResolving();
    s.recordMiss();
    expect(s.snapshot().carrotsLeft).toBe(0);
    expect(s.snapshot().phase).toBe('round_over');
  });
});

describe('Session round transitions', () => {
  it('nextRound advances index, resets carrots, returns to aiming', () => {
    const s = createSession({ rounds: [Q1, Q2], carrotsPerRound: 3 });
    s.startResolving();
    s.recordHit();
    s.nextRound();
    expect(s.snapshot()).toMatchObject({ currentIndex: 1, carrotsLeft: 3, phase: 'aiming' });
    expect(s.currentQuestion()).toEqual(Q2);
  });

  it('nextRound from the last round transitions to session_over', () => {
    const s = createSession({ rounds: [Q1, Q2], carrotsPerRound: 3 });
    s.startResolving();
    s.recordHit();
    s.nextRound();
    s.startResolving();
    s.recordMiss();
    s.startResolving();
    s.recordMiss();
    s.startResolving();
    s.recordMiss();
    s.nextRound();
    expect(s.snapshot().phase).toBe('session_over');
    expect(s.isOver()).toBe(true);
  });
});

describe('Session phase guards', () => {
  it('startResolving requires aiming phase', () => {
    const s = createSession({ rounds: [Q1], carrotsPerRound: 3 });
    s.startResolving();
    expect(() => s.startResolving()).toThrow();
  });
});
