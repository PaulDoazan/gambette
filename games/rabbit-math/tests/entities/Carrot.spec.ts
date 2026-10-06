import { describe, it, expect } from 'vitest';
import { createCarrot } from '../../src/entities/Carrot';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';

describe('Carrot initial', () => {
  it('starts not launched and at the supplied position', () => {
    const w = createPhysicsWorld();
    const c = createCarrot({ x: 50, y: 80 }, w);
    expect(c.isLaunched()).toBe(false);
    expect(c.body.position()).toMatchObject({ x: 50, y: 80 });
    w.destroy();
  });
});

describe('Carrot launch', () => {
  it('enables dynamic motion (body becomes non-static, velocity applied)', () => {
    const w = createPhysicsWorld();
    const c = createCarrot({ x: 50, y: 80 }, w);
    c.launch({ x: 8, y: -10 });
    expect(c.isLaunched()).toBe(true);
    for (let i = 0; i < 10; i++) w.step(16);
    expect(c.body.position().x).toBeGreaterThan(50);
    expect(c.body.position().y).not.toBeCloseTo(80, 1);
    w.destroy();
  });
});

describe('Carrot rest', () => {
  it('restAtGround stops motion and freezes the body', () => {
    const w = createPhysicsWorld();
    const c = createCarrot({ x: 50, y: 80 }, w);
    c.launch({ x: 8, y: -10 });
    c.restAtGround({ x: 200, y: 320 });
    for (let i = 0; i < 10; i++) w.step(16);
    expect(c.body.position()).toMatchObject({ x: 200, y: 320 });
    expect(c.body.velocity()).toEqual({ x: 0, y: 0 });
    w.destroy();
  });
});
