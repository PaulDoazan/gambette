import { describe, it, expect } from 'vitest';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';

const OPTS = { density: 1, friction: 0.05, restitution: 0.2 };

describe('PhysicsWorld', () => {
  it('gravité vers le bas', () => {
    const w = createPhysicsWorld();
    expect(w.gravityY()).toBeGreaterThan(0);
    w.destroy();
  });

  it('createCircle / removeBody gèrent le contenu du monde', () => {
    const w = createPhysicsWorld();
    const b = w.createCircle({ x: 100, y: 100 }, 5, OPTS);
    expect(w.bodyCount()).toBe(1);
    expect(b.position()).toEqual({ x: 100, y: 100 });
    w.removeBody(b);
    expect(w.bodyCount()).toBe(0);
    w.destroy();
  });

  it('un corps créé est statique : il ne tombe pas', () => {
    const w = createPhysicsWorld();
    const b = w.createCircle({ x: 100, y: 100 }, 5, OPTS);
    for (let i = 0; i < 30; i++) w.step(1000 / 60);
    expect(b.position().y).toBeCloseTo(100, 5);
    w.destroy();
  });

  it('dynamique : step fait tomber le corps ; setVelocity en px/frame', () => {
    const w = createPhysicsWorld();
    const b = w.createCircle({ x: 100, y: 100 }, 5, OPTS);
    b.setStatic(false);
    b.setVelocity({ x: 6, y: 0 });
    w.step(1000 / 60);
    expect(b.position().x).toBeGreaterThan(105);
    expect(b.position().x).toBeLessThan(107);
    for (let i = 0; i < 30; i++) w.step(1000 / 60);
    expect(b.position().y).toBeGreaterThan(100);
    w.destroy();
  });
});
