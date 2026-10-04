import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createGameScene, initialPuckPositions } from '../../src/scenes/GameScene';
import { campOf } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import { PUCKS_PER_PLAYER } from '../../src/config/dimensions';

let physics: PhysicsWorld;
afterEach(() => physics.destroy());

describe('GameScene', () => {
  it('5 palets par camp au départ', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, onWin: vi.fn() });
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(PUCKS_PER_PLAYER);
    expect(camps.filter((c) => c === 'B')).toHaveLength(PUCKS_PER_PLAYER);
    expect(initialPuckPositions('A')).toHaveLength(PUCKS_PER_PLAYER);
    scene.destroy();
  });

  it('camp A vidé pendant 1 s → onWin("A") une seule fois', () => {
    physics = createPhysicsWorld();
    const onWin = vi.fn();
    const scene = createGameScene({ physics, onWin });
    scene
      .pucks()
      .forEach((p, i) => p.setPosition({ x: 80 + (i % 5) * 130, y: 200 + Math.floor(i / 5) * 90 }));
    for (let i = 0; i < 70; i++) scene.tick(1000 / 60);
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onWin).toHaveBeenCalledWith('A');
    scene.destroy();
  });

  it('palet lancé : ignore l’élastique jusqu’à l’avoir repassé, puis le respecte à nouveau', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, onWin: vi.fn() });
    const line = elasticLine('A');
    const puck = scene.pucks().find((p) => campOf(p.position().y) === 'A')!;
    const start = puck.position();
    scene.drag.pointerDown(1, start);
    for (let y = start.y; y <= line.y + 80; y += 20) {
      scene.drag.pointerMove(1, { x: start.x, y });
      scene.tick(50);
    }
    expect(puck.ignoresElastic()).toBe(true);
    scene.drag.pointerUp(1);
    for (let i = 0; i < 30; i++) scene.tick(1000 / 60);
    expect(puck.position().y).toBeLessThan(line.y);
    expect(puck.ignoresElastic()).toBe(false);
    scene.destroy();
  });

  it('reset remet les palets en place et réarme la victoire', () => {
    physics = createPhysicsWorld();
    const onWin = vi.fn();
    const scene = createGameScene({ physics, onWin });
    scene.pucks().forEach((p) => p.setPosition({ x: 360, y: 200 }));
    for (let i = 0; i < 70; i++) scene.tick(1000 / 60);
    scene.reset();
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(PUCKS_PER_PLAYER);
    onWin.mockClear();
    for (let i = 0; i < 10; i++) scene.tick(1000 / 60);
    expect(onWin).not.toHaveBeenCalled();
    scene.destroy();
  });

  it('reset remet aussi la rotation des palets à zéro', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, onWin: vi.fn() });
    scene.pucks().forEach((p) => p.body.setAngularVelocity(5));
    scene.reset();
    expect(scene.pucks().every((p) => p.body.getAngularVelocity() === 0)).toBe(true);
    scene.destroy();
  });
});
