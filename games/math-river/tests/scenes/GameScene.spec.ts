import { describe, it, expect, vi } from 'vitest';
import { computeAnswer, mulberry32, type Pair } from '@gambette/math-sdk';
import { createGameScene, bucketHome } from '../../src/scenes/GameScene';
import { holeCenter } from '../../src/domain/aim';
import { MAX_RANGE, MAX_STRETCH } from '../../src/config/dimensions';
import { MIN_LEVEL, START_LEVEL, flightMs } from '../../src/config/water';
import { PAN_MS, ROUNDS, UI_FADE_MS } from '../../src/config/rounds';
import type { Player, Vec } from '../../src/domain/types';

const PAIRS: Pair[] = [
  { a: 6, b: 8, op: 'mul' },
  { a: 7, b: 4, op: 'mul' },
  { a: 3, b: 9, op: 'mul' },
];

const make = (onWin = vi.fn(), onUiHidden = vi.fn()) => ({
  scene: createGameScene({ pairs: { A: PAIRS, B: PAIRS }, rng: mulberry32(3), onWin, onUiHidden }),
  onWin,
  onUiHidden,
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
/**
 * Avance le temps par pas de `step` ms (50 par défaut : chaque pas redessine tout le monde, et les
 * parties longues doivent rester rapides en CI).
 */
const run = (scene: Scene, ms: number, step = 50): void => {
  for (let t = 0; t < ms; t += step) scene.tick(step);
};
const WATER_PER_BUCKET = ROUNDS[0]!.perBucket;
const MAX_FLIGHT = flightMs(MAX_RANGE) + 50;
/** Eau infiltrée pendant `ms` ms de jeu. */
const seeped = (ms: number): number => (ROUNDS[0]!.drainPerSecond * ms) / 1000;
/** Fin de manche complète : effacement, trajet du poisson, retour de l'interface. */
const TRANSITION = PAN_MS + 2 * UI_FADE_MS + 100;
/** Bons seaux au centre, en alternant les joueurs, jusqu'à ce que l'eau atteigne le canal. */
const fillHole = (scene: Scene): void => {
  for (let k = 0; k < 80 && scene.level() < 1; k++) {
    const pl: Player = k % 2 ? 'B' : 'A';
    throwBucket(scene, pl, scene.correctIndex(pl), holeCenter());
    run(scene, MAX_FLIGHT);
  }
  expect(scene.level()).toBe(1);
};

describe('GameScene', () => {
  it('calculs séparés : chaque joueur tire dans sa propre sélection', () => {
    const B: Pair[] = [{ a: 2, b: 5, op: 'add' }];
    const scene = createGameScene({ pairs: { A: PAIRS, B }, rng: mulberry32(3), onWin: vi.fn() });
    for (let k = 0; k < 6; k++) {
      expect(PAIRS).toContainEqual(scene.calc('A'));
      expect(scene.calc('B')).toEqual(B[0]);
      throwBucket(scene, 'A', scene.correctIndex('A'), holeCenter());
      throwBucket(scene, 'B', scene.correctIndex('B'), holeCenter());
      run(scene, MAX_FLIGHT);
    }
  });

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
    expect(scene.level()).toBeGreaterThan(
      START_LEVEL + WATER_PER_BUCKET - seeped(MAX_FLIGHT + 100),
    );
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
    expect(scene.level()).toBeGreaterThan(
      START_LEVEL + 2 * WATER_PER_BUCKET - seeped(MAX_FLIGHT + 100),
    );
  });

  it('sans tir, le trou ne se vide jamais sous le plancher', () => {
    const { scene } = make();
    run(scene, 60_000, 100);
    expect(scene.level()).toBe(MIN_LEVEL);
  });

  it('fin de manche 1 : l’interface s’efface, le poisson gagne le trou 2, puis on rejoue', () => {
    const { scene, onWin, onUiHidden } = make();
    fillHole(scene);
    expect(onUiHidden).toHaveBeenLastCalledWith(true);
    expect(scene.uiVisible()).toBe(false);
    expect(scene.round()).toBe(0);
    // Pendant la transition, un seau ne se saisit pas.
    const i = scene.correctIndex('A');
    scene.pointerDown(1, bucketHome('A', i));
    scene.pointerMove(1, gripFor('A', i, holeCenter()));
    expect(scene.buckets('A')[i]!.position).toEqual(bucketHome('A', i));
    scene.pointerUp(1);
    run(scene, TRANSITION);
    expect(scene.round()).toBe(1);
    expect(scene.cameraX()).toBe(720);
    // Repart du fond de départ (l'infiltration a repris avec l'interface).
    expect(scene.level()).toBeLessThanOrEqual(START_LEVEL);
    expect(scene.level()).toBeGreaterThan(START_LEVEL - seeped(2 * UI_FADE_MS + 100));
    expect(onUiHidden).toHaveBeenLastCalledWith(false);
    expect(scene.uiVisible()).toBe(true);
    expect(onWin).not.toHaveBeenCalled();
    // Jouable, avec l'apport de la manche 2.
    throwBucket(scene, 'A', scene.correctIndex('A'), holeCenter());
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeGreaterThan(
      START_LEVEL + ROUNDS[1]!.perBucket - seeped(2 * UI_FADE_MS + 200 + MAX_FLIGHT),
    );
  });

  it('le plus grand trou de la manche 3 attrape l’eau tombée plus loin du centre', () => {
    const { scene } = make();
    for (let r = 0; r < 2; r++) {
      fillHole(scene);
      run(scene, TRANSITION);
    }
    expect(scene.round()).toBe(2);
    const far = { x: holeCenter().x - 200, y: holeCenter().y };
    throwBucket(scene, 'A', scene.correctIndex('A'), far);
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeGreaterThan(START_LEVEL);
  });

  it('doigt posé en fin de manche : le seau revient sans tirer', () => {
    const { scene } = make();
    for (let k = 0; k < 80; k++) {
      const pl: Player = k % 2 ? 'B' : 'A';
      throwBucket(scene, pl, scene.correctIndex(pl), holeCenter());
      run(scene, MAX_FLIGHT - 200);
      if (scene.level() + ROUNDS[0]!.perBucket >= 1) break;
      run(scene, 200);
    }
    // B tient un seau quand l'eau en vol de A remplit le trou.
    const i = scene.correctIndex('B');
    scene.pointerDown(2, bucketHome('B', i));
    scene.pointerMove(2, gripFor('B', i, holeCenter()));
    run(scene, 400);
    expect(scene.uiVisible()).toBe(false);
    expect(scene.buckets('B')[i]!.position).toEqual(bucketHome('B', i));
    scene.pointerUp(2);
    expect(scene.buckets('B')[i]!.empty).toBe(false);
  });

  it('eau en vol en fin de manche : elle ne compte pas pour le trou suivant', () => {
    const { scene } = make();
    for (let k = 0; k < 80 && scene.level() < 1; k++) {
      const pl: Player = k % 2 ? 'B' : 'A';
      throwBucket(scene, pl, scene.correctIndex(pl), holeCenter());
      // B tire aussi : son eau est encore en vol quand celle de A remplit le trou.
      if (pl === 'A') throwBucket(scene, 'B', scene.correctIndex('B'), holeCenter());
      run(scene, MAX_FLIGHT);
    }
    run(scene, TRANSITION);
    expect(scene.round()).toBe(1);
    expect(scene.level()).toBeLessThanOrEqual(START_LEVEL);
    expect(scene.buckets('B').every((b) => !b.empty)).toBe(true);
  });

  it('trois manches remplies : victoire une seule fois, après la manche 3', () => {
    const { scene, onWin } = make();
    for (let r = 0; r < 2; r++) {
      fillHole(scene);
      run(scene, TRANSITION);
      expect(onWin).not.toHaveBeenCalled();
    }
    fillHole(scene);
    run(scene, TRANSITION);
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(scene.round()).toBe(2);
    run(scene, 2000);
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  it('reset après la victoire : retour à la manche 1, jouable', () => {
    const { scene } = make();
    for (let r = 0; r < 3; r++) {
      fillHole(scene);
      run(scene, TRANSITION);
    }
    scene.reset();
    expect(scene.round()).toBe(0);
    expect(scene.cameraX()).toBe(0);
    expect(scene.level()).toBe(START_LEVEL);
    expect(scene.uiVisible()).toBe(true);
    throwBucket(scene, 'A', scene.correctIndex('A'), holeCenter());
    run(scene, MAX_FLIGHT);
    expect(scene.level()).toBeGreaterThan(START_LEVEL);
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

  it('pointillés du trou en bleu tant qu’un joueur vise dedans, blancs sinon', () => {
    const { scene } = make();
    const c = holeCenter();
    const a = scene.correctIndex('A');
    const b = scene.correctIndex('B');
    expect(scene.holeHighlighted()).toBe(false);
    scene.pointerDown(1, bucketHome('A', a));
    scene.pointerMove(1, gripFor('A', a, { x: c.x - 300, y: c.y + 260 }));
    expect(scene.holeHighlighted()).toBe(false);
    scene.pointerMove(1, gripFor('A', a, c));
    expect(scene.holeHighlighted()).toBe(true);
    // B vise aussi dedans, puis A relâche sans tirer : B vise toujours le trou.
    scene.pointerDown(2, bucketHome('B', b));
    scene.pointerMove(2, gripFor('B', b, c));
    scene.pointerCancel(1);
    expect(scene.holeHighlighted()).toBe(true);
    scene.pointerUp(2);
    expect(scene.holeHighlighted()).toBe(false);
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
