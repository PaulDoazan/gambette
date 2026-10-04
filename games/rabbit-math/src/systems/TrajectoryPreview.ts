import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';
import {
  CARROT_DENSITY,
  CARROT_FRICTION,
  CARROT_RADIUS,
  CARROT_RESTITUTION,
  GRAVITY_Y,
} from '../config/physics';
import { CARROT_GROUND_Y } from '../config/dimensions';

export interface Vec {
  x: number;
  y: number;
}

const MAX_SIM_STEPS = 240;
const SIM_DT_MS = 1000 / 60;

const makeBody = (start: Vec): Matter.Body =>
  Matter.Bodies.circle(start.x, start.y, CARROT_RADIUS, {
    density: CARROT_DENSITY,
    friction: CARROT_FRICTION,
    restitution: CARROT_RESTITUTION,
  });

export function computeTrajectoryPoints(start: Vec, velocity: Vec): Vec[] {
  const engine = Matter.Engine.create();
  engine.gravity.y = GRAVITY_Y;
  const body = makeBody(start);
  Matter.World.add(engine.world, body);
  Matter.Body.setVelocity(body, velocity);
  return simulate(engine, body);
}

const simulate = (engine: Matter.Engine, body: Matter.Body): Vec[] => {
  const out: Vec[] = [{ x: body.position.x, y: body.position.y }];
  for (let i = 0; i < MAX_SIM_STEPS; i++) {
    Matter.Engine.update(engine, SIM_DT_MS);
    const p = { x: body.position.x, y: body.position.y };
    out.push(p);
    if (p.y >= CARROT_GROUND_Y && body.velocity.y > 0) break;
  }
  Matter.Engine.clear(engine);
  return out;
};

export interface TrajectoryPreview {
  readonly view: Container;
  show(points: readonly Vec[]): void;
  clear(): void;
}

const drawDots = (g: Graphics, points: readonly Vec[]): void => {
  g.clear();
  for (let i = 1; i < points.length; i += 3) {
    const p = points[i]!;
    g.circle(p.x, p.y, 3).fill(COLORS.outline);
  }
};

export function createTrajectoryPreview(): TrajectoryPreview {
  const view = new Container();
  const g = new Graphics();
  view.addChild(g);
  return { view, show: (points) => drawDots(g, points), clear: () => g.clear() };
}
