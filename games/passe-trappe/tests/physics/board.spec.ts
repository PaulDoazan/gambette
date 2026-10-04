import { describe, it, expect, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createBoard } from '../../src/entities/Board';
import { createPuck } from '../../src/entities/Puck';
import { campOf } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import { DESIGN_WIDTH, MID_Y, PUCK_RADIUS } from '../../src/config/dimensions';

let physics: PhysicsWorld;
const run = (ms: number): void => {
  for (let t = 0; t < ms; t += 1000 / 60) physics.step(1000 / 60);
};
const setup = () => {
  physics = createPhysicsWorld();
  createBoard(physics);
};

afterEach(() => physics.destroy());

describe('plateau planck', () => {
  it('palet lancé vers le trou → passe dans l’autre camp', () => {
    setup();
    const p = createPuck(physics, { x: DESIGN_WIDTH / 2, y: 900 });
    p.setVelocity({ x: 0, y: -1500 });
    run(2000);
    expect(campOf(p.position().y)).toBe('B');
  });

  it('palet contre un mur latéral → rebondit', () => {
    setup();
    const p = createPuck(physics, { x: 600, y: 900 });
    p.setVelocity({ x: 1500, y: 0 });
    run(400);
    expect(p.velocity().x).toBeLessThan(0);
    expect(p.position().x).toBeLessThanOrEqual(DESIGN_WIDTH - PUCK_RADIUS + 1);
  });

  it('palet très rapide contre la cloison → ne la traverse pas', () => {
    setup();
    const p = createPuck(physics, { x: 150, y: 760 });
    p.setVelocity({ x: 0, y: -8000 });
    for (let i = 0; i < 120; i++) {
      physics.step(1000 / 60);
      expect(p.position().y).toBeGreaterThan(MID_Y);
    }
  });

  it('deux palets → collision et transfert d’élan', () => {
    setup();
    const a = createPuck(physics, { x: 200, y: 1010 });
    const b = createPuck(physics, { x: 200, y: 880 });
    a.setVelocity({ x: 0, y: -800 });
    run(200);
    expect(b.velocity().y).toBeLessThan(0);
  });

  it('le frottement du plateau finit par arrêter le palet', () => {
    setup();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.setVelocity({ x: 300, y: 0 });
    run(5000);
    expect(Math.hypot(p.velocity().x, p.velocity().y)).toBeLessThan(5);
  });

  it('un palet libre est arrêté par l’élastique', () => {
    setup();
    const line = elasticLine('A');
    const p = createPuck(physics, { x: 360, y: line.y - 80 });
    p.setVelocity({ x: 0, y: 1200 });
    run(800);
    expect(p.position().y).toBeLessThan(line.y);
  });

  it('un palet qui ignore l’élastique le traverse', () => {
    setup();
    const line = elasticLine('A');
    const p = createPuck(physics, { x: 360, y: line.y + 60 });
    p.setIgnoreElastic(true);
    p.setVelocity({ x: 0, y: -1200 });
    run(200);
    expect(p.position().y).toBeLessThan(line.y);
  });
});
