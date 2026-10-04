import { describe, it, expect } from 'vitest';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';
import Matter from 'matter-js';

describe('PhysicsWorld create', () => {
  it('creates an engine with downward gravity', () => {
    const w = createPhysicsWorld();
    expect(w.engine.gravity.y).toBeGreaterThan(0);
    w.destroy();
  });
});

describe('PhysicsWorld add/remove', () => {
  it('addBody / removeBody manage the world contents', () => {
    const w = createPhysicsWorld();
    const body = Matter.Bodies.circle(100, 100, 5);
    w.addBody(body);
    expect(w.engine.world.bodies).toContain(body);
    w.removeBody(body);
    expect(w.engine.world.bodies).not.toContain(body);
    w.destroy();
  });
});

describe('PhysicsWorld step', () => {
  it('step advances the simulation for the requested ms', () => {
    const w = createPhysicsWorld();
    const body = Matter.Bodies.circle(100, 100, 5);
    w.addBody(body);
    const startY = body.position.y;
    for (let i = 0; i < 30; i++) w.step(1000 / 60);
    expect(body.position.y).toBeGreaterThan(startY);
    w.destroy();
  });
});
