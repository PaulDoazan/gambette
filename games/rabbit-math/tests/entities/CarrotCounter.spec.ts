import { describe, it, expect } from 'vitest';
import { createCarrotCounter } from '../../src/entities/CarrotCounter';

describe('CarrotCounter init', () => {
  it('starts with the requested number of remaining icons', () => {
    const c = createCarrotCounter(3);
    expect(c.remaining()).toBe(3);
  });
});

describe('CarrotCounter setRemaining', () => {
  it('decreases the count', () => {
    const c = createCarrotCounter(3);
    c.setRemaining(2);
    expect(c.remaining()).toBe(2);
  });

  it('caps at the original total', () => {
    const c = createCarrotCounter(3);
    c.setRemaining(5);
    expect(c.remaining()).toBe(3);
  });

  it('clamps at 0', () => {
    const c = createCarrotCounter(3);
    c.setRemaining(-1);
    expect(c.remaining()).toBe(0);
  });
});
