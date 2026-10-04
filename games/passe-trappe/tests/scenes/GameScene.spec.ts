import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createGameScene, initialPuckPositions } from '../../src/scenes/GameScene';
import { campOf } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import { computeAnswer, mulberry32, type Pair } from '@gambette/math-sdk';
import { WRONG_LAUNCH_SPEED } from '../../src/config/physics';
import {
  CALC_BLOCK,
  CALC_BLOCK_SIZE,
  DIVIDER_THICKNESS,
  MID_Y,
  PUCK_RADIUS as R,
} from '../../src/config/dimensions';

const PAIRS: Pair[] = [
  { a: 6, b: 8, op: 'mul' },
  { a: 7, b: 4, op: 'mul' },
  { a: 9, b: 3, op: 'mul' },
];

let physics: PhysicsWorld;
afterEach(() => physics.destroy());

describe('GameScene', () => {
  it('5 palets par camp au départ', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(5);
    expect(camps.filter((c) => c === 'B')).toHaveLength(5);
    expect(initialPuckPositions('A', 5)).toHaveLength(5);
    scene.destroy();
  });

  it('camp A vidé pendant 1 s → onWin("A") une seule fois', () => {
    physics = createPhysicsWorld();
    const onWin = vi.fn();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin,
    });
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
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    const line = elasticLine('A');
    // Seul le bon palet part à l'élastique.
    const puck = scene.pucks().find((p) => campOf(p.position().y) === 'A' && scene.isCorrect(p))!;
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
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin,
    });
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
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
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

describe('initialPuckPositions — bloc de calcul', () => {
  for (let count = 5; count <= 10; count++) {
    it(`${count} palets : aucun palet ne touche le bloc de calcul de son camp`, () => {
      for (const pl of ['A', 'B'] as const) {
        const c = CALC_BLOCK[pl];
        for (const p of initialPuckPositions(pl, count)) {
          const dx = Math.max(Math.abs(p.x - c.x) - CALC_BLOCK_SIZE.w / 2, 0);
          const dy = Math.max(Math.abs(p.y - c.y) - CALC_BLOCK_SIZE.h / 2, 0);
          expect(Math.hypot(dx, dy)).toBeGreaterThan(R);
        }
      }
    });
  }
});

describe('GameScene — nombre de palets', () => {
  it('10 palets par joueur', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 10,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(10);
    expect(camps.filter((c) => c === 'B')).toHaveLength(10);
    scene.destroy();
  });
});

const correctPerCamp = (scene: ReturnType<typeof createGameScene>) => {
  const out = { A: 0, B: 0 };
  for (const p of scene.pucks()) if (scene.isCorrect(p)) out[campOf(p.position().y)] += 1;
  return out;
};

describe('GameScene — palet à cheval sur l’élastique', () => {
  const lineA = elasticLine('A');
  /** Tient un palet de A à l'étirement maximal, après avoir écarté les autres. */
  const holdStretched = (x: number, wrong: boolean) => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(3),
      onWin: vi.fn(),
    });
    const inA = scene.pucks().filter((p) => campOf(p.position().y) === 'A');
    const puck = inA.find((p) => scene.isCorrect(p) !== wrong)!;
    inA.filter((p) => p !== puck).forEach((p, i) => p.setPosition({ x: 100 + i * 130, y: 700 }));
    puck.setPosition({ x, y: 950 });
    scene.tick(1000 / 60);
    scene.drag.pointerDown(1, { x, y: 950 });
    for (let y = 950; y <= lineA.y + 150; y += 20) {
      scene.drag.pointerMove(1, { x, y });
      for (let i = 0; i < 3; i++) scene.tick(1000 / 60);
    }
    return { scene, puck };
  };
  const settle = (scene: ReturnType<typeof createGameScene>) => {
    for (let i = 0; i < 180; i++) scene.tick(1000 / 60);
  };

  for (const x of [360, 650]) {
    it(`mauvais palet relâché de l’étirement max (x = ${x}) : revient devant l’élastique, réarmé`, () => {
      const { scene, puck } = holdStretched(x, true);
      scene.drag.pointerUp(1);
      settle(scene);
      expect(puck.position().y + R).toBeLessThan(lineA.y);
      expect(puck.ignoresElastic()).toBe(false);
      scene.destroy();
    });
  }

  it('palet tenu à l’étirement max puis reset de la saisie : revient devant l’élastique, réarmé', () => {
    const { scene, puck } = holdStretched(360, false);
    scene.drag.reset();
    settle(scene);
    expect(puck.position().y + R).toBeLessThan(lineA.y);
    expect(puck.ignoresElastic()).toBe(false);
    scene.destroy();
  });
});

describe('GameScene — calcul', () => {
  it('les blocs de calcul sont affichés sous les palets', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    const order = scene.view.children;
    const lastBlock = Math.max(
      ...(['A', 'B'] as const).map((p) =>
        order.findIndex((c) => c.x === CALC_BLOCK[p].x && c.y === CALC_BLOCK[p].y),
      ),
    );
    const firstPuck = Math.min(...scene.pucks().map((p) => order.indexOf(p.view)));
    expect(lastBlock).toBeGreaterThanOrEqual(0);
    expect(lastBlock).toBeLessThan(firstPuck);
    scene.destroy();
  });

  it('au départ : un calcul par camp et une seule bonne réponse par camp, valeurs distinctes', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    expect(correctPerCamp(scene)).toEqual({ A: 1, B: 1 });
    for (const pl of ['A', 'B'] as const) {
      const vals = scene
        .pucks()
        .filter((p) => campOf(p.position().y) === pl)
        .map((p) => p.label());
      expect(new Set(vals).size).toBe(vals.length);
      expect(vals).toContain(computeAnswer(scene.calc(pl)));
    }
    scene.destroy();
  });

  it('un palet passe la ligne médiane → les deux calculs changent, une bonne réponse par camp', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(2),
      onWin: vi.fn(),
    });
    const before = { A: scene.calc('A'), B: scene.calc('B') };
    const mover = scene.pucks().find((p) => campOf(p.position().y) === 'A')!;
    mover.setPosition({ x: 360, y: 520 }); // camp B, entre la rangée de B (y≈395) et la cloison
    for (let i = 0; i < 25; i++) scene.tick(1000 / 60);
    expect(scene.calc('A')).not.toEqual(before.A);
    expect(scene.calc('B')).not.toEqual(before.B);
    expect(correctPerCamp(scene)).toEqual({ A: 1, B: 1 });
    expect(mover.label()).not.toBeNull();
    scene.destroy();
  });

  it('le lancer suit l’étiquette au relâcher', () => {
    const lineA = elasticLine('A');
    // Étire le palet derrière l'élastique via scene.drag, relâche, laisse quelques frames passer.
    const launch = (which: 'wrong' | 'right') => {
      physics = createPhysicsWorld();
      const scene = createGameScene({
        physics,
        pucksPerPlayer: 5,
        pairs: PAIRS,
        rng: mulberry32(3),
        onWin: vi.fn(),
      });
      const inA = scene.pucks().filter((p) => campOf(p.position().y) === 'A');
      const puck = inA.find((p) => scene.isCorrect(p) === (which === 'right'))!;
      expect(puck).toBeDefined();
      // Les autres palets du camp A sont écartés pour dégager le chemin d'étirement.
      inA.filter((p) => p !== puck).forEach((p, i) => p.setPosition({ x: 100 + i * 130, y: 700 }));
      puck.setPosition({ x: 360, y: 950 });
      scene.tick(1000 / 60);
      scene.drag.pointerDown(1, { x: 360, y: 950 });
      for (let y = 950; y <= lineA.y + 80; y += 20) {
        scene.drag.pointerMove(1, { x: 360, y });
        for (let i = 0; i < 3; i++) scene.tick(1000 / 60);
      }
      scene.drag.pointerUp(1);
      for (let i = 0; i < 3; i++) scene.tick(1000 / 60);
      const v = puck.velocity();
      const result = { speed: Math.hypot(v.x, v.y), vy: v.y, vibrating: puck.isVibrating() };
      scene.destroy();
      physics.destroy();
      return result;
    };
    const wrong = launch('wrong');
    expect(wrong.speed).toBeLessThanOrEqual(WRONG_LAUNCH_SPEED + 1);
    expect(wrong.vibrating).toBe(true);
    const right = launch('right');
    expect(right.vy).toBeLessThan(-500);
    expect(right.vibrating).toBe(false);
  });

  it('destroy libère tous les corps planck (hors ancrage)', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    scene.destroy();
    let n = 0;
    for (let b = physics.world.getBodyList(); b; b = b.getNext()) n += 1;
    expect(n).toBe(1); // ground
  });
});
