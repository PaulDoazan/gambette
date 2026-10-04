import { describe, it, expect } from 'vitest';
import { createGameScene } from '../../src/scenes/GameScene';
import { DEFAULT_SETTINGS } from '../../src/services/Settings';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';

describe('GameScene skeleton structure', () => {
  it('initialises with a non-null view containing static decor + 4 rabbits', () => {
    const physics = createPhysicsWorld();
    const scene = createGameScene({
      settings: DEFAULT_SETTINGS,
      physics,
      onOpenSettings: () => {},
      onSessionRestart: () => {},
      onToggleFullscreen: () => {},
    });
    expect(scene.view.children.length).toBeGreaterThan(0);
    expect(scene.rabbits().length).toBe(4);
    physics.destroy();
  });
});

describe('GameScene skeleton question', () => {
  it('first question is set on the math sign', () => {
    const physics = createPhysicsWorld();
    const scene = createGameScene({
      settings: DEFAULT_SETTINGS,
      physics,
      onOpenSettings: () => {},
      onSessionRestart: () => {},
      onToggleFullscreen: () => {},
    });
    expect(scene.mathSign().text()).toMatch(/× .* = \?/);
    physics.destroy();
  });
});
