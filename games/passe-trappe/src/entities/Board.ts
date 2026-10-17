import { Container, Graphics } from 'pixi.js';
import { Box, Edge, Vec2, type Body } from 'planck';
import type { PhysicsWorld, FixtureTag } from '../core/PhysicsWorld';
import {
  CALC_BLOCK,
  CALC_BLOCK_SIZE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  GAP_WIDTH,
  MID_Y,
  NO_DRAG_RADIUS,
} from '../config/dimensions';
import { CATEGORY } from '../config/physics';
import { COLORS } from '../config/theme';
import { elasticLine } from '../domain/elastic';
import { PLAYERS, type Player } from '../domain/types';

export interface Board {
  readonly view: Container;
  destroy(): void;
}

const WALL_TAG: FixtureTag = { kind: 'wall' };
const wallFilter = { filterCategoryBits: CATEGORY.WALL, filterMaskBits: CATEGORY.PUCK };

const addEdge = (
  physics: PhysicsWorld,
  bodies: Body[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  category: number,
): void => {
  const m = physics.toM;
  const body = physics.world.createBody();
  bodies.push(body);
  body.createFixture({
    shape: new Edge(Vec2(m(x1), m(y1)), Vec2(m(x2), m(y2))),
    filterCategoryBits: category,
    filterMaskBits: CATEGORY.PUCK,
    userData: WALL_TAG,
  });
};

const addBox = (
  physics: PhysicsWorld,
  bodies: Body[],
  cx: number,
  cy: number,
  w: number,
  h: number,
): void => {
  const m = physics.toM;
  const body = physics.world.createBody({ position: Vec2(m(cx), m(cy)) });
  bodies.push(body);
  body.createFixture({ shape: new Box(m(w / 2), m(h / 2)), ...wallFilter, userData: WALL_TAG });
};

const segmentWidth = (DESIGN_WIDTH - GAP_WIDTH) / 2;

/** Pointillés de la zone interdite au glisser : longueur d'un tiret et d'un espace (px). */
const DASH = { on: 16, off: 26, width: 12 } as const;

/** Demi-cercle en pointillés autour du passage, côté `player` (A : vers le bas, B : vers le haut). */
const drawNoDragZone = (g: Graphics, player: Player): void => {
  const cx = DESIGN_WIDTH / 2;
  const r = NO_DRAG_RADIUS;
  const sign = player === 'A' ? 1 : -1;
  const step = (DASH.on + DASH.off) / r;
  const dash = DASH.on / r;
  // Commence et finit au bord de la cloison, pas dessous.
  const start = Math.asin(Math.min(1, DIVIDER_THICKNESS / 2 / r));
  for (let a = start; a < Math.PI - start; a += step) {
    const b = Math.min(a + dash, Math.PI - start);
    g.moveTo(cx + r * Math.cos(a), MID_Y + sign * r * Math.sin(a));
    g.arc(cx, MID_Y, r, sign * a, sign * b, sign < 0);
  }
  g.stroke({ width: DASH.width, color: 0xffffff, alpha: 0.8, cap: 'round' });
};

const draw = (g: Graphics): void => {
  g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(COLORS.table);
  g.rect(0, MID_Y - DIVIDER_THICKNESS / 2, segmentWidth, DIVIDER_THICKNESS).fill(COLORS.divider);
  g.rect(
    DESIGN_WIDTH - segmentWidth,
    MID_Y - DIVIDER_THICKNESS / 2,
    segmentWidth,
    DIVIDER_THICKNESS,
  ).fill(COLORS.divider);
  g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).stroke({ width: 8, color: COLORS.rim });
};

export function createBoard(physics: PhysicsWorld): Board {
  const bodies: Body[] = [];
  const W = DESIGN_WIDTH;
  const H = DESIGN_HEIGHT;
  addEdge(physics, bodies, 0, 0, W, 0, CATEGORY.WALL);
  addEdge(physics, bodies, W, 0, W, H, CATEGORY.WALL);
  addEdge(physics, bodies, W, H, 0, H, CATEGORY.WALL);
  addEdge(physics, bodies, 0, H, 0, 0, CATEGORY.WALL);
  addBox(physics, bodies, segmentWidth / 2, MID_Y, segmentWidth, DIVIDER_THICKNESS);
  addBox(physics, bodies, W - segmentWidth / 2, MID_Y, segmentWidth, DIVIDER_THICKNESS);
  // Blocs de calcul solides : les palets rebondissent dessus au lieu de les recouvrir.
  for (const p of PLAYERS) {
    const c = CALC_BLOCK[p];
    addBox(physics, bodies, c.x, c.y, CALC_BLOCK_SIZE.w, CALC_BLOCK_SIZE.h);
  }
  for (const p of PLAYERS) {
    const line = elasticLine(p);
    addEdge(physics, bodies, line.left.x, line.y, line.right.x, line.y, CATEGORY.ELASTIC);
  }
  const view = new Container();
  const g = new Graphics();
  draw(g);
  view.addChild(g);
  for (const p of PLAYERS) {
    const zone = new Graphics();
    zone.label = `no-drag-${p}`;
    drawNoDragZone(zone, p);
    view.addChild(zone);
  }
  return {
    view,
    destroy: () => {
      for (const b of bodies) physics.world.destroyBody(b);
      bodies.length = 0;
      view.destroy({ children: true });
    },
  };
}
