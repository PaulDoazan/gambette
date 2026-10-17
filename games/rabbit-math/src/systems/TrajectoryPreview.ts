import { createPhysicsWorld, type PxBody, type PhysicsWorld } from '../core/PhysicsWorld';
import { Container, Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';
import {
  CARROT_DENSITY,
  CARROT_FRICTION,
  CARROT_RADIUS,
  CARROT_RESTITUTION,
} from '../config/physics';
import { CARROT_GROUND_Y } from '../config/dimensions';

export interface Vec {
  x: number;
  y: number;
}

const MAX_SIM_STEPS = 240;
const SIM_DT_MS = 1000 / 60;

export function computeTrajectoryPoints(start: Vec, velocity: Vec): Vec[] {
  const world = createPhysicsWorld();
  const body = world.createCircle(start, CARROT_RADIUS, {
    density: CARROT_DENSITY,
    friction: CARROT_FRICTION,
    restitution: CARROT_RESTITUTION,
  });
  body.setStatic(false);
  body.setVelocity(velocity);
  const points = simulate(world, body);
  world.destroy();
  return points;
}

const simulate = (world: PhysicsWorld, body: PxBody): Vec[] => {
  const out: Vec[] = [body.position()];
  for (let i = 0; i < MAX_SIM_STEPS; i++) {
    world.step(SIM_DT_MS);
    const p = body.position();
    out.push(p);
    if (p.y >= CARROT_GROUND_Y && body.velocity().y > 0) break;
  }
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
