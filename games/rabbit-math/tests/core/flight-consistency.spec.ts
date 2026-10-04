import { describe, it, expect } from 'vitest';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';
import { createCarrot } from '../../src/entities/Carrot';
import { computeTrajectoryPoints } from '../../src/systems/TrajectoryPreview';

describe('cohérence aperçu / vol réel', () => {
  it('une carotte lancée suit les points de l’aperçu à 1 px près', () => {
    const start = { x: 200, y: 520 };
    const v = { x: 11, y: -11 };
    const preview = computeTrajectoryPoints(start, v);
    const physics = createPhysicsWorld();
    const carrot = createCarrot(start, physics);
    carrot.launch(v);
    for (let i = 1; i < Math.min(preview.length, 60); i++) {
      physics.step(1000 / 60);
      const p = carrot.body.position();
      expect(Math.hypot(p.x - preview[i]!.x, p.y - preview[i]!.y)).toBeLessThanOrEqual(1);
    }
    physics.destroy();
  });
});
