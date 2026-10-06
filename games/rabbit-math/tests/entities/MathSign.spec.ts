import { describe, it, expect } from 'vitest';
import { createMathSign } from '../../src/entities/MathSign';
import { MATH_SIGN } from '../../src/config/dimensions';
import type { Question } from '@gambette/math-sdk';

const Q: Question = { a: 7, b: 8, op: 'mul', answer: 56, choices: [56, 48, 63, 54] };

describe('MathSign default', () => {
  it('default width matches the configured default', () => {
    const s = createMathSign();
    expect(s.currentWidth()).toBe(MATH_SIGN.defaultWidth);
  });
});

describe('MathSign content', () => {
  it('setQuestion stores the formatted text', () => {
    const s = createMathSign();
    s.setQuestion(Q);
    expect(s.text()).toBe('7 × 8 = ?');
  });

  it('setEndOfSessionMessage formats X / N text', () => {
    const s = createMathSign();
    s.setEndOfSessionMessage(7, 10);
    expect(s.text()).toBe('7 / 10 bonnes réponses');
  });
});

describe('MathSign width', () => {
  it('setWidth(value) updates currentWidth synchronously', () => {
    const s = createMathSign();
    s.setWidth(MATH_SIGN.expandedWidth);
    expect(s.currentWidth()).toBe(MATH_SIGN.expandedWidth);
  });
});
