import { describe, it, expect, afterEach, vi } from 'vitest';
import * as dims from '../../src/config/dimensions';
import { boardHeightFor, configureBoard } from '../../src/config/dimensions';
import { elasticLine } from '../../src/domain/elastic';
import { campOf } from '../../src/domain/rules';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';
import { createGameScene, scatteredPuckPositions } from '../../src/scenes/GameScene';
import { mulberry32 } from '@gambette/math-sdk';

afterEach(() => configureBoard(1280));

describe('boardHeightFor — hauteur du plateau adaptée à l’écran', () => {
  it('écran 9:16 → 1280 ; écran plus allongé → plateau plus haut', () => {
    expect(boardHeightFor(360, 640)).toBe(1280);
    expect(boardHeightFor(390, 844)).toBe(Math.round((720 * 844) / 390));
  });

  it('écran plus large que 9:16 (tablette) → 1280 au minimum', () => {
    expect(boardHeightFor(768, 1024)).toBe(1280);
  });

  it('écran absurde (très étroit) → plafonné', () => {
    expect(boardHeightFor(100, 2000)).toBe(dims.MAX_BOARD_HEIGHT);
  });
});

describe('configureBoard', () => {
  it('recalcule la ligne médiane, les élastiques, les blocs et l’engrenage', () => {
    configureBoard(1560);
    expect(dims.DESIGN_HEIGHT).toBe(1560);
    expect(dims.MID_Y).toBe(780);
    expect(elasticLine('A').y).toBe(1560 - dims.ELASTIC_INSET);
    expect(elasticLine('B').y).toBe(dims.ELASTIC_INSET);
    expect(dims.CALC_BLOCK.A.y).toBeGreaterThan(780);
    expect(dims.CALC_BLOCK.B.y).toBeLessThan(780);
    expect(dims.GEAR.y).toBe(780);
    expect(campOf(790)).toBe('A');
    expect(campOf(770)).toBe('B');
  });

  it('plateau haut : disposition valide et les palets restent dans le plateau', () => {
    configureBoard(1560);
    for (const pl of ['A', 'B'] as const)
      for (const p of scatteredPuckPositions(pl, 10, mulberry32(3))) expect(campOf(p.y)).toBe(pl);
    const physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: [{ a: 6, b: 8, op: 'mul' }],
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    const puck = scene.pucks()[0]!;
    puck.setPosition({ x: 360, y: 1300 });
    puck.setIgnoreElastic(true);
    puck.setVelocity({ x: 0, y: 2000 });
    for (let i = 0; i < 60; i++) scene.tick(1000 / 60);
    expect(puck.position().y).toBeLessThanOrEqual(1560 - dims.PUCK_RADIUS + 1);
    scene.destroy();
    physics.destroy();
  });
});
