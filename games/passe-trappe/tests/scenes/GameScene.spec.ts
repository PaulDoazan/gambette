import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createGameScene, initialPuckPositions } from '../../src/scenes/GameScene';
import { campOf } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import { DIVIDER_THICKNESS, MID_Y, PUCK_RADIUS as R } from '../../src/config/dimensions';

let physics: PhysicsWorld;
afterEach(() => physics.destroy());

describe('GameScene', () => {
  it('5 palets par camp au départ', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, pucksPerPlayer: 5, onWin: vi.fn() });
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(5);
    expect(camps.filter((c) => c === 'B')).toHaveLength(5);
    expect(initialPuckPositions('A', 5)).toHaveLength(5);
    scene.destroy();
  });

  it('camp A vidé pendant 1 s → onWin("A") une seule fois', () => {
    physics = createPhysicsWorld();
    const onWin = vi.fn();
    const scene = createGameScene({ physics, pucksPerPlayer: 5, onWin });
    scene
      .pucks()
      .forEach((p, i) =>
        p.setPosition({ x: 70 + (i % 5) * 145, y: 230 + Math.floor(i / 5) * 125 }),
      );
    for (let i = 0; i < 70; i++) scene.tick(1000 / 60);
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onWin).toHaveBeenCalledWith('A');
    scene.destroy();
  });

  it('palet lancé : ignore l’élastique jusqu’à l’avoir repassé, puis le respecte à nouveau', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, pucksPerPlayer: 5, onWin: vi.fn() });
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
    const scene = createGameScene({ physics, pucksPerPlayer: 5, onWin });
    scene.pucks().forEach((p) => p.setPosition({ x: 360, y: 200 }));
    for (let i = 0; i < 70; i++) scene.tick(1000 / 60);
    scene.reset();
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(5);
    onWin.mockClear();
    for (let i = 0; i < 10; i++) scene.tick(1000 / 60);
    expect(onWin).not.toHaveBeenCalled();
    scene.destroy();
  });

  it('reset remet aussi la rotation des palets à zéro', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, pucksPerPlayer: 5, onWin: vi.fn() });
    scene.pucks().forEach((p) => p.body.setAngularVelocity(5));
    scene.reset();
    expect(scene.pucks().every((p) => p.body.getAngularVelocity() === 0)).toBe(true);
    scene.destroy();
  });
});

describe('initialPuckPositions', () => {
  for (const count of [5, 6, 8, 10]) {
    it(`${count} palets : dans le camp, devant l’élastique, sans chevauchement`, () => {
      for (const pl of ['A', 'B'] as const) {
        const pos = initialPuckPositions(pl, count);
        expect(pos).toHaveLength(count);
        const line = elasticLine(pl);
        for (const p of pos) {
          expect(campOf(p.y)).toBe(pl);
          expect(p.x - R).toBeGreaterThanOrEqual(0);
          expect(p.x + R).toBeLessThanOrEqual(720);
          if (pl === 'A') {
            expect(p.y - R).toBeGreaterThan(MID_Y + DIVIDER_THICKNESS / 2);
            expect(p.y + R).toBeLessThan(line.y);
          } else {
            expect(p.y + R).toBeLessThan(MID_Y - DIVIDER_THICKNESS / 2);
            expect(p.y - R).toBeGreaterThan(line.y);
          }
        }
        for (let i = 0; i < pos.length; i++)
          for (let j = i + 1; j < pos.length; j++)
            expect(Math.hypot(pos[i]!.x - pos[j]!.x, pos[i]!.y - pos[j]!.y)).toBeGreaterThan(2 * R);
      }
    });
  }
});

describe('GameScene — nombre de palets', () => {
  it('10 palets par joueur', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, pucksPerPlayer: 10, onWin: vi.fn() });
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(10);
    expect(camps.filter((c) => c === 'B')).toHaveLength(10);
    scene.destroy();
  });
});
