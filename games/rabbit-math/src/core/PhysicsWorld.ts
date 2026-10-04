import { Circle, Vec2, World, type Body } from 'planck';
import { CARROT_LINEAR_DAMPING, FRAME_S, GRAVITY_M_S2, PX_PER_M } from '../config/physics';

export interface Vec {
  x: number;
  y: number;
}
export interface CircleOptions {
  density: number;
  friction: number;
  restitution: number;
}

/** Corps vu en pixels ; vitesses en px par frame à 60 fps (unité historique, conservée). */
export interface PxBody {
  position(): Vec;
  velocity(): Vec;
  angle(): number;
  setPosition(p: Vec): void;
  setVelocity(v: Vec): void;
  setAngularVelocity(w: number): void;
  setStatic(isStatic: boolean): void;
}

export interface PhysicsWorld {
  createCircle(at: Vec, radius: number, opts: CircleOptions): PxBody;
  removeBody(b: PxBody): void;
  bodyCount(): number;
  gravityY(): number;
  step(deltaMs: number): void;
  destroy(): void;
}

const toM = (px: number): number => px / PX_PER_M;
const toPx = (m: number): number => m * PX_PER_M;
/** px/frame → m/s */
const vToMs = (pxPerFrame: number): number => toM(pxPerFrame) / FRAME_S;
/** m/s → px/frame */
const vToPx = (ms: number): number => toPx(ms) * FRAME_S;

const wrap = (body: Body): PxBody => ({
  position: () => {
    const p = body.getPosition();
    return { x: toPx(p.x), y: toPx(p.y) };
  },
  velocity: () => {
    const v = body.getLinearVelocity();
    return { x: vToPx(v.x), y: vToPx(v.y) };
  },
  angle: () => body.getAngle(),
  setPosition: (p) => body.setPosition(Vec2(toM(p.x), toM(p.y))),
  setVelocity: (v) => body.setLinearVelocity(Vec2(vToMs(v.x), vToMs(v.y))),
  setAngularVelocity: (w) => body.setAngularVelocity(w / FRAME_S),
  setStatic: (isStatic) => {
    if (isStatic) body.setStatic();
    else {
      body.setDynamic();
      body.setAwake(true);
    }
  },
});

export function createPhysicsWorld(): PhysicsWorld {
  const world = new World({ gravity: Vec2(0, GRAVITY_M_S2) });
  const bodies = new Map<PxBody, Body>();
  return {
    createCircle: (at, radius, opts) => {
      const body = world.createBody({
        type: 'static',
        position: Vec2(toM(at.x), toM(at.y)),
        linearDamping: CARROT_LINEAR_DAMPING,
      });
      body.createFixture({ shape: new Circle(toM(radius)), ...opts });
      const px = wrap(body);
      bodies.set(px, body);
      return px;
    },
    removeBody: (b) => {
      const body = bodies.get(b);
      if (!body) return;
      world.destroyBody(body);
      bodies.delete(b);
    },
    bodyCount: () => bodies.size,
    gravityY: () => vToPx(GRAVITY_M_S2 * FRAME_S),
    step: (deltaMs) => world.step(deltaMs / 1000),
    destroy: () => {
      for (const body of bodies.values()) world.destroyBody(body);
      bodies.clear();
    },
  };
}
