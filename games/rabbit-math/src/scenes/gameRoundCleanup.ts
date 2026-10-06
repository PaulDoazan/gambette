import type { PxBody } from '../core/PhysicsWorld';
import type { Carrot } from '../entities/Carrot';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import { tweenObject } from '../entities/animations/Tween';

export interface CleanupDeps {
  physics: PhysicsWorld;
  delay: (ms: number) => Promise<void>;
  owned: Set<PxBody>;
}

export async function fadeOutAndRemove(d: CleanupDeps, c: Carrot): Promise<void> {
  await d.delay(1000);
  await tweenObject(c.view, { alpha: 0 }, 400);
  d.physics.removeBody(c.body);
  d.owned.delete(c.body);
  c.view.parent?.removeChild(c.view);
}

export function purgeOwnedBodies(physics: PhysicsWorld, owned: Set<PxBody>): void {
  for (const b of owned) physics.removeBody(b);
  owned.clear();
}
