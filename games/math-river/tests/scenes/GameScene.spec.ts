import { describe, it, expect, vi } from 'vitest';
import { computeAnswer, mulberry32, type Pair } from '@gambette/math-sdk';
import { createGameScene, bucketHome } from '../../src/scenes/GameScene';
import { holeCenter } from '../../src/domain/aim';
import { MAX_RANGE, MAX_STRETCH } from '../../src/config/dimensions';
import {
  ESCAPE_MS,
  MIN_LEVEL,
  START_LEVEL,
  WATER_PER_BUCKET,
  flightMs,
} from '../../src/config/water';
import type { Player, Vec } from '../../src/domain/types';

const PAIRS: Pair[] = [
  { a: 6, b: 8, op: 'mul' },
  { a: 7, b: 4, op: 'mul' },
  { a: 3, b: 9, op: 'mul' },
];

const make = (onWin = vi.fn()) => ({
  scene: createGameScene({ pairs: PAIRS, rng: mulberry32(3), onWin }),
  onWin,
});

type Scene = ReturnType<typeof make>['scene'];

/** Point où tirer le seau `i` pour que l'eau tombe en `target`. */
const gripFor = (pl: Player, i: number, target: Vec): Vec => {
  const home = bucketHome(pl, i);
  const dx = target.x - home.x;
  const dy = target.y - home.y;
  const range = Math.hypot(dx, dy);
  const stretch = (range / MAX_RANGE) * MAX_STRETCH;
  return { x: home.x - (dx / range) * stretch, y: home.y - (dy / range) * stretch };
};

const ids: Record<Player, number> = { A: 1, B: 2 };
const throwBucket = (scene: Scene, pl: Player, i: number, target: Vec): void => {
  scene.pointerDown(ids[pl], bucketHome(pl, i));
  scene.pointerMove(ids[pl], gripFor(pl, i, target));
  scene.pointerUp(ids[pl]);
};
const wrongIndex = (scene: Scene, pl: Player): number => (scene.correctIndex(pl) + 1) % 5;
/** Avance le temps par pas de 16 ms. */
const run = (scene: Scene, ms: number): void => {
  for (let t = 0; t < ms; t += 16) scene.tick(16);
};
const MAX_FLIGHT = flightMs(MAX_RANGE) + 50;

describe('GameScene', () => {
  it('chaque joueur a son calcul et 5 seaux, dont un seul porte la bonne réponse', () => {
    const { scene } = make();
    for (const pl of ['A', 'B'] as const) {
      const values = scene.buckets(pl).map((b) => b.value);
      expect(values).toHaveLength(5);
      expect(values.filter((v) => v === computeAnswer(scene.calc(pl)))).toHaveLength(1);
      expect(values[scene.correctIndex(pl)]).toBe(computeAnswer(scene.calc(pl)));
    }
    expect(scene.level()).toBe(START_LEVEL);
  });

  it('bon seau dans le trou : l’eau monte à l’atterrissage, puis nouveau calcul', () => {
    const { scene } = make();
    const before = scene.calc('A');
    throwBucket(scene, 'A', scene.correctIndex('A'), holeCenter());
    expect(scene.buckets('A')[scene.correctIndex('A')]!.empty).toBe(true);
    expect(scene.level()).toBe(START_LEVEL); // encore en vol
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeGreaterThan(START_LEVEL + WATER_PER_BUCKET - 0.05);
    expect(scene.calc('A')).not.toBe(before);
    expect(scene.buckets('A').every((b) => !b.empty)).toBe(true);
  });

  it('bon seau à côté : niveau inchangé (hors infiltration), nouveau calcul quand même', () => {
    const { scene } = make();
    const before = scene.calc('A');
    const c = holeCenter();
    throwBucket(scene, 'A', scene.correctIndex('A'), { x: c.x - 300, y: c.y + 260 });
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeLessThan(START_LEVEL);
    expect(scene.calc('A')).not.toBe(before);
  });

  it('mauvais seau : il se vide sur place, le trou ne se remplit pas, le calcul reste', () => {
    const { scene } = make();
    const before = scene.calc('A');
    const i = wrongIndex(scene, 'A');
    throwBucket(scene, 'A', i, holeCenter());
    expect(scene.buckets('A')[i]!.empty).toBe(true);
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeLessThan(START_LEVEL);
    expect(scene.calc('A')).toBe(before);
    expect(scene.buckets('A')[i]!.empty).toBe(true);
  });

  it('un seau vide ne se saisit plus ; pas de tir sous le seuil d’étirement', () => {
    const { scene } = make();
    const i = wrongIndex(scene, 'A');
    throwBucket(scene, 'A', i, holeCenter());
    // Petit glisser sur le bon seau : il revient à sa place sans tirer.
    const ok = scene.correctIndex('A');
    const home = bucketHome('A', ok);
    scene.pointerDown(1, home);
    scene.pointerMove(1, { x: home.x, y: home.y + 5 });
    scene.pointerUp(1);
    expect(scene.buckets('A')[ok]!.empty).toBe(false);
    expect(scene.buckets('A')[ok]!.position).toEqual(home);
  });

  it('pendant le vol de son seau, le joueur ne peut pas en saisir un autre', () => {
    const { scene } = make();
    throwBucket(scene, 'A', scene.correctIndex('A'), holeCenter());
    const other = wrongIndex(scene, 'A');
    throwBucket(scene, 'A', other, holeCenter());
    expect(scene.buckets('A')[other]!.empty).toBe(false);
  });

  it('les deux joueurs tirent en même temps', () => {
    const { scene } = make();
    const a = scene.correctIndex('A');
    const b = scene.correctIndex('B');
    scene.pointerDown(1, bucketHome('A', a));
    scene.pointerDown(2, bucketHome('B', b));
    scene.pointerMove(1, gripFor('A', a, holeCenter()));
    scene.pointerMove(2, gripFor('B', b, holeCenter()));
    scene.pointerUp(1);
    scene.pointerUp(2);
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeGreaterThan(START_LEVEL + 2 * WATER_PER_BUCKET - 0.05);
  });

  it('sans tir, le trou ne se vide jamais sous le plancher', () => {
    const { scene } = make();
    run(scene, 120_000);
    expect(scene.level()).toBe(MIN_LEVEL);
  });

  it('eau au niveau du canal : plus de tir, le poisson s’échappe, puis onWin une seule fois', () => {
    const { scene, onWin } = make();
    for (let k = 0; k < 10 && scene.level() < 1; k++) {
      const pl: Player = k % 2 ? 'B' : 'A';
      throwBucket(scene, pl, scene.correctIndex(pl), holeCenter());
      run(scene, MAX_FLIGHT);
    }
    expect(scene.level()).toBe(1);
    expect(onWin).not.toHaveBeenCalled();
    const i = scene.correctIndex('A');
    throwBucket(scene, 'A', i, holeCenter());
    expect(scene.buckets('A')[i]!.empty).toBe(false);
    run(scene, ESCAPE_MS + 200);
    expect(onWin).toHaveBeenCalledTimes(1);
    run(scene, 1000);
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  it('doigt annulé par le système : le seau revient sans tirer et le joueur peut rejouer', () => {
    const { scene } = make();
    const i = scene.correctIndex('A');
    scene.pointerDown(1, bucketHome('A', i));
    scene.pointerMove(1, gripFor('A', i, holeCenter()));
    scene.pointerCancel(1);
    expect(scene.buckets('A')[i]!.empty).toBe(false);
    expect(scene.buckets('A')[i]!.position).toEqual(bucketHome('A', i));
    throwBucket(scene, 'A', i, holeCenter());
    expect(scene.buckets('A')[i]!.empty).toBe(true);
  });

  it('releaseAll : le seau tenu revient sans tirer', () => {
    const { scene } = make();
    const i = scene.correctIndex('A');
    scene.pointerDown(1, bucketHome('A', i));
    scene.pointerMove(1, gripFor('A', i, holeCenter()));
    scene.releaseAll();
    scene.pointerUp(1);
    expect(scene.buckets('A')[i]!.empty).toBe(false);
    expect(scene.buckets('A')[i]!.position).toEqual(bucketHome('A', i));
  });

  it('reset : niveau de départ, seaux pleins, nouvelle partie jouable', () => {
    const { scene, onWin } = make();
    throwBucket(scene, 'A', wrongIndex(scene, 'A'), holeCenter());
    throwBucket(scene, 'B', scene.correctIndex('B'), holeCenter());
    run(scene, 300);
    scene.reset();
    expect(scene.level()).toBe(START_LEVEL);
    for (const pl of ['A', 'B'] as const)
      expect(scene.buckets(pl).every((b) => !b.empty)).toBe(true);
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeLessThan(START_LEVEL);
    expect(onWin).not.toHaveBeenCalled();
    scene.destroy();
  });
});
