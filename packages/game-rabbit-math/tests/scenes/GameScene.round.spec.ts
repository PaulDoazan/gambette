import { describe, it, expect } from 'vitest';
import { createGameScene } from '../../src/scenes/GameScene';
import { DEFAULT_SETTINGS } from '../../src/services/Settings';
import { CARROTS_PER_ROUND } from '../../src/domain/sessionConfig';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';

const baseDeps = {
  onOpenSettings: () => {},
  onSessionRestart: () => {},
  onToggleFullscreen: () => {},
};

describe('GameScene round flow — score', () => {
  it('forceCorrectHit advances score by 1', () => {
    const physics = createPhysicsWorld();
    const scene = createGameScene({ settings: DEFAULT_SETTINGS, physics, ...baseDeps });
    const before = scene.session().snapshot().score;
    scene.forceCorrectHit();
    expect(scene.session().snapshot().score).toBe(before + 1);
    physics.destroy();
  });
});

describe('GameScene round flow — round end after misses', () => {
  it('after CARROTS_PER_ROUND wrong hits, the round is over with no score', () => {
    const physics = createPhysicsWorld();
    const scene = createGameScene({ settings: DEFAULT_SETTINGS, physics, ...baseDeps });
    for (let i = 0; i < CARROTS_PER_ROUND; i++) scene.forceWrongHit();
    expect(scene.session().snapshot().score).toBe(0);
    expect(scene.session().snapshot().phase).toBe('round_over');
    physics.destroy();
  });
});

describe('GameScene rabbit count', () => {
  it('creates rabbitsCount rabbits', () => {
    for (const n of [4, 5, 6, 7, 8] as const) {
      const physics = createPhysicsWorld();
      const scene = createGameScene({
        settings: { ...DEFAULT_SETTINGS, rabbitsCount: n },
        physics,
        ...baseDeps,
      });
      expect(scene.rabbits()).toHaveLength(n);
      physics.destroy();
    }
  });
});
