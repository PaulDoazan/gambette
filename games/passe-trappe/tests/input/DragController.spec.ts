import { describe, it, expect, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createBoard } from '../../src/entities/Board';
import { createPuck, type Puck } from '../../src/entities/Puck';
import { createDragController } from '../../src/input/DragController';
import { elasticLine } from '../../src/domain/elastic';
import { campOf } from '../../src/domain/rules';
import { MID_Y } from '../../src/config/dimensions';
import { DROP_MAX_SPEED } from '../../src/config/physics';

let physics: PhysicsWorld;
const step = (n = 1): void => {
  for (let i = 0; i < n; i++) physics.step(1000 / 60);
};

const setup = (positions: Array<{ x: number; y: number }>) => {
  physics = createPhysicsWorld();
  createBoard(physics);
  const pucks: Puck[] = positions.map((p) => createPuck(physics, p));
  const drag = createDragController({ physics, pucks: () => pucks });
  return { pucks, drag };
};

afterEach(() => physics.destroy());

describe('DragController', () => {
  it('saisir un palet de son camp, l’étirer derrière l’élastique et relâcher → lancé vers la cloison', () => {
    const lineA = elasticLine('A');
    const { pucks, drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 360, y: 900 });
    expect(drag.held('A')).toBe(pucks[0]);
    for (let y = 900; y <= lineA.y + 80; y += 20) {
      drag.pointerMove(1, { x: 360, y });
      step(3);
    }
    drag.pointerUp(1);
    expect(drag.held('A')).toBeNull();
    expect(pucks[0]!.velocity().y).toBeLessThan(-500);
  });

  it('toucher dans le vide de son camp → rien n’est saisi', () => {
    const { drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 100, y: 1000 });
    expect(drag.held('A')).toBeNull();
  });

  it('impossible de saisir un palet du camp adverse', () => {
    const { drag } = setup([{ x: 360, y: MID_Y - 30 }]);
    drag.pointerDown(1, { x: 360, y: MID_Y + 5 });
    expect(drag.held('A')).toBeNull();
    expect(drag.held('B')).toBeNull();
  });

  it('second doigt du même joueur ignoré ; les deux joueurs en même temps', () => {
    const { pucks, drag } = setup([
      { x: 200, y: 900 },
      { x: 500, y: 900 },
      { x: 360, y: 380 },
    ]);
    drag.pointerDown(1, { x: 200, y: 900 });
    drag.pointerDown(2, { x: 500, y: 900 });
    drag.pointerDown(3, { x: 360, y: 380 });
    expect(drag.held('A')).toBe(pucks[0]);
    expect(drag.held('B')).toBe(pucks[2]);
  });

  it('le palet tenu ne franchit pas la cloison même si le doigt la passe', () => {
    const { pucks, drag } = setup([{ x: 150, y: 800 }]);
    drag.pointerDown(1, { x: 150, y: 800 });
    drag.pointerMove(1, { x: 150, y: 200 });
    step(60);
    expect(pucks[0]!.position().y).toBeGreaterThan(MID_Y);
  });

  it('pousser un palet à la main ne le fait pas passer la cloison', () => {
    const { pucks, drag } = setup([
      { x: 360, y: 900 },
      { x: 360, y: 760 },
    ]);
    drag.pointerDown(1, { x: 360, y: 900 });
    for (let y = 900; y >= 100; y -= 10) {
      drag.pointerMove(1, { x: 360, y });
      step(1);
    }
    step(60);
    expect(campOf(pucks[1]!.position().y)).toBe('A');
  });

  it('relâcher sans étirer → palet simplement lâché (pas de lancer)', () => {
    const { pucks, drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 360, y: 900 });
    drag.pointerUp(1);
    step(30);
    expect(Math.hypot(pucks[0]!.velocity().x, pucks[0]!.velocity().y)).toBeLessThan(50);
  });

  it('balayer puis lâcher devant l’élastique → vitesse plafonnée à DROP_MAX_SPEED', () => {
    const { pucks, drag } = setup([{ x: 360, y: 1000 }]);
    drag.pointerDown(1, { x: 360, y: 1000 });
    for (let y = 1000; y <= 1240; y += 60) {
      drag.pointerMove(1, { x: 360, y });
      step(3);
    }
    drag.pointerMove(1, { x: 360, y: 900 });
    step(3);
    drag.pointerUp(1);
    const v = pucks[0]!.velocity();
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(DROP_MAX_SPEED + 1);
  });

  it('reset et destroy relâchent les palets tenus (aucun joint restant)', () => {
    const { drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 360, y: 900 });
    drag.reset();
    expect(drag.held('A')).toBeNull();
    expect(physics.world.getJointList()).toBeNull();
  });
});
