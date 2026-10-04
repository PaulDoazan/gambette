import Matter from 'matter-js';
import { GRAVITY_Y } from '../config/physics';

export interface PhysicsWorld {
  readonly engine: Matter.Engine;
  addBody(body: Matter.Body): void;
  removeBody(body: Matter.Body): void;
  step(deltaMs: number): void;
  destroy(): void;
}

export function createPhysicsWorld(): PhysicsWorld {
  const engine = Matter.Engine.create();
  engine.gravity.y = GRAVITY_Y;
  return {
    engine,
    addBody: (b) => Matter.World.add(engine.world, b),
    removeBody: (b) => Matter.World.remove(engine.world, b),
    step: (deltaMs) => Matter.Engine.update(engine, deltaMs),
    destroy: () => Matter.Engine.clear(engine),
  };
}
