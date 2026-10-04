import { Container, Graphics } from 'pixi.js';
import { Circle, Vec2, type Body } from 'planck';
import type { PhysicsWorld, FixtureTag } from '../core/PhysicsWorld';
import { PUCK_RADIUS } from '../config/dimensions';
import {
  CATEGORY,
  PUCK_DENSITY,
  PUCK_FRICTION,
  PUCK_LINEAR_DAMPING,
  PUCK_RESTITUTION,
} from '../config/physics';
import { COLORS } from '../config/theme';
import type { Vec } from '../domain/types';

export interface Puck {
  readonly view: Container;
  readonly body: Body;
  position(): Vec;
  /** px/s */
  velocity(): Vec;
  setVelocity(v: Vec): void;
  setPosition(p: Vec): void;
  /** true : le palet traverse l'élastique (palet tenu ou tout juste lancé). */
  setIgnoreElastic(on: boolean): void;
  ignoresElastic(): boolean;
  syncView(): void;
  destroy(): void;
}

const PUCK_TAG: FixtureTag = { kind: 'puck' };
const MASK_ALL = CATEGORY.PUCK | CATEGORY.WALL | CATEGORY.ELASTIC;
const MASK_NO_ELASTIC = CATEGORY.PUCK | CATEGORY.WALL;

const drawPuck = (g: Graphics): void => {
  g.circle(0, 0, PUCK_RADIUS).fill(COLORS.puck).stroke({ width: 4, color: COLORS.puckEdge });
  g.circle(0, 0, PUCK_RADIUS * 0.45).stroke({ width: 2, color: COLORS.puckEdge });
};

export function createPuck(physics: PhysicsWorld, at: Vec): Puck {
  const { toM, toPx } = physics;
  const body = physics.world.createBody({
    type: 'dynamic',
    position: Vec2(toM(at.x), toM(at.y)),
    bullet: true,
    linearDamping: PUCK_LINEAR_DAMPING,
    angularDamping: 2,
  });
  const fixture = body.createFixture({
    shape: new Circle(toM(PUCK_RADIUS)),
    density: PUCK_DENSITY,
    friction: PUCK_FRICTION,
    restitution: PUCK_RESTITUTION,
    filterCategoryBits: CATEGORY.PUCK,
    filterMaskBits: MASK_ALL,
    userData: PUCK_TAG,
  });
  const view = new Container();
  const g = new Graphics();
  drawPuck(g);
  view.addChild(g);
  let ignoring = false;

  const api: Puck = {
    view,
    body,
    position: () => {
      const p = body.getPosition();
      return { x: toPx(p.x), y: toPx(p.y) };
    },
    velocity: () => {
      const v = body.getLinearVelocity();
      return { x: toPx(v.x), y: toPx(v.y) };
    },
    setVelocity: (v) => {
      body.setLinearVelocity(Vec2(toM(v.x), toM(v.y)));
      body.setAwake(true);
    },
    setPosition: (p) => {
      body.setPosition(Vec2(toM(p.x), toM(p.y)));
      body.setAwake(true);
    },
    setIgnoreElastic: (on) => {
      ignoring = on;
      fixture.setFilterData({
        groupIndex: 0,
        categoryBits: CATEGORY.PUCK,
        maskBits: on ? MASK_NO_ELASTIC : MASK_ALL,
      });
    },
    ignoresElastic: () => ignoring,
    syncView: () => {
      const p = api.position();
      view.position.set(p.x, p.y);
      view.rotation = body.getAngle();
    },
    destroy: () => {
      physics.world.destroyBody(body);
      view.destroy({ children: true });
    },
  };
  api.syncView();
  return api;
}
