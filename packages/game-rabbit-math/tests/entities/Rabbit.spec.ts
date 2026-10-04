import { describe, it, expect } from 'vitest';
import { createRabbit } from '../../src/entities/Rabbit';
import { tickTweens } from '../../src/entities/animations/Tween';

const runTweens = async (durationMs: number) => {
  const start = performance.now();
  for (let t = 0; t <= durationMs; t += 16) {
    tickTweens(start + t);
    await Promise.resolve();
  }
};

describe('Rabbit number', () => {
  it('setNumber stores the number returned by getNumber', () => {
    const r = createRabbit({ position: { x: 100, y: 100 } });
    r.setNumber(56);
    expect(r.getNumber()).toBe(56);
  });
});

describe('Rabbit fallen state', () => {
  it('starts not fallen', () => {
    const r = createRabbit({ position: { x: 0, y: 0 } });
    expect(r.isFallen()).toBe(false);
  });

  it('markFallen flips the flag', () => {
    const r = createRabbit({ position: { x: 0, y: 0 } });
    r.markFallen();
    expect(r.isFallen()).toBe(true);
  });
});

describe('Rabbit collision aabb', () => {
  it('returns a finite axis-aligned box around its position', () => {
    const r = createRabbit({ position: { x: 200, y: 100 } });
    const box = r.getCollisionAabb();
    expect(box.minX).toBeLessThan(box.maxX);
    expect(box.minY).toBeLessThan(box.maxY);
    expect(box.minX).toBeGreaterThan(150);
    expect(box.maxX).toBeLessThan(250);
  });
});

describe('Rabbit playShakeNo', () => {
  it('resolves without changing fallen state', async () => {
    const r = createRabbit({ position: { x: 100, y: 100 } });
    const p = r.playShakeNo();
    await runTweens(1200);
    await p;
    expect(r.isFallen()).toBe(false);
  });
});

describe('Rabbit playChew', () => {
  it('resolves without changing fallen state', async () => {
    const r = createRabbit({ position: { x: 100, y: 100 } });
    const p = r.playChew(2);
    await runTweens(1500);
    await p;
    expect(r.isFallen()).toBe(false);
  });
});

describe('Rabbit playJumpFromTree', () => {
  it('sets isFallen true and updates position.y', async () => {
    const r = createRabbit({ position: { x: 100, y: 100 } });
    const p = r.playJumpFromTree(330);
    await runTweens(1500);
    await p;
    expect(r.isFallen()).toBe(true);
    expect(r.position.y).toBe(330);
  });
});

describe('Rabbit playRunAwayRight', () => {
  it('moves position.x to the off-screen target', async () => {
    const r = createRabbit({ position: { x: 100, y: 330 } });
    const p = r.playRunAwayRight(900);
    await runTweens(1200);
    await p;
    expect(r.position.x).toBeGreaterThanOrEqual(900);
  });
});
