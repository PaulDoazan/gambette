import { describe, it, expect } from 'vitest';
import { createSlingshot } from '../../src/entities/Slingshot';
import { SLINGSHOT_ANCHOR } from '../../src/config/dimensions';
import { SLINGSHOT_MAX_PULL } from '../../src/config/physics';

describe('Slingshot anchor', () => {
  it('anchor matches the configured position', () => {
    const s = createSlingshot();
    expect(s.anchor()).toEqual(SLINGSHOT_ANCHOR);
  });
});

describe('Slingshot aim', () => {
  it('clamps the pull vector magnitude to SLINGSHOT_MAX_PULL', () => {
    const s = createSlingshot();
    s.aimAt({ x: SLINGSHOT_ANCHOR.x + 400, y: SLINGSHOT_ANCHOR.y });
    const offset = {
      x: s.carrotPosition().x - SLINGSHOT_ANCHOR.x,
      y: s.carrotPosition().y - SLINGSHOT_ANCHOR.y,
    };
    const m = Math.hypot(offset.x, offset.y);
    expect(m).toBeLessThanOrEqual(SLINGSHOT_MAX_PULL + 0.01);
  });
});

describe('Slingshot release', () => {
  it('releaseVelocity returns a vector opposite to the pull (forward fling)', () => {
    const s = createSlingshot();
    s.aimAt({ x: SLINGSHOT_ANCHOR.x - 60, y: SLINGSHOT_ANCHOR.y - 40 });
    const v = s.releaseVelocity();
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeGreaterThan(0);
  });

  it('reset moves the carrot back to the anchor', () => {
    const s = createSlingshot();
    s.aimAt({ x: SLINGSHOT_ANCHOR.x - 50, y: SLINGSHOT_ANCHOR.y - 30 });
    s.reset();
    expect(s.carrotPosition()).toEqual(SLINGSHOT_ANCHOR);
  });
});
