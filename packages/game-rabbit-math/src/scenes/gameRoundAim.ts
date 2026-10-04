import { computeTrajectoryPoints } from '../systems/TrajectoryPreview';
import { classifyHit } from '../systems/CollisionHandler';
import { MOUTH_TWEEN_MS, type Rabbit } from '../entities/Rabbit';
import type { Slingshot } from '../entities/Slingshot';
import type { TrajectoryPreview } from '../systems/TrajectoryPreview';

export interface Vec {
  x: number;
  y: number;
}

const TRAJ_SIM_DT_MS = 1000 / 60;

const aabbsOf = (rs: readonly Rabbit[]) =>
  rs.map((r) => (r.isFallen() ? { minX: 0, maxX: 0, minY: 0, maxY: 0 } : r.getCollisionAabb()));

export const findTargetedHit = (
  rabbits: readonly Rabbit[],
  points: readonly Vec[],
): { rabbitIdx: number; trimAt: number } => {
  const aabbs = aabbsOf(rabbits);
  for (let i = 0; i < points.length; i++) {
    const c = classifyHit(points[i]!, aabbs);
    if (c.kind === 'rabbit') return { rabbitIdx: c.index, trimAt: i + 1 };
  }
  return { rabbitIdx: -1, trimAt: points.length };
};

const updateAimedRabbits = (rabbits: readonly Rabbit[], targetedIdx: number): void => {
  rabbits.forEach((r, i) => r.setAimed(i === targetedIdx));
};

const closeMouthsForRelease = (
  rabbits: readonly Rabbit[],
  targetIdx: number,
  trimAt: number,
  delay: (ms: number) => Promise<void>,
  isDestroyed: () => boolean,
): void => {
  rabbits.forEach((r, i) => {
    if (i !== targetIdx) r.setAimed(false);
  });
  if (targetIdx < 0) return;
  const target = rabbits[targetIdx]!;
  const delayMs = Math.max(0, trimAt * TRAJ_SIM_DT_MS - MOUTH_TWEEN_MS);
  void delay(delayMs).then(() => {
    if (!isDestroyed()) target.setAimed(false);
  });
};

export interface AimCtx {
  rabbits: readonly Rabbit[];
  slingshot: Slingshot;
  preview: TrajectoryPreview;
  carrotBodyPos: () => Vec;
  setCarrotPos: (p: Vec) => void;
  delay: (ms: number) => Promise<void>;
  isAiming: () => boolean;
  isDestroyed: () => boolean;
  onLaunch: (v: Vec) => void;
}

export const makeOnAim = (ctx: AimCtx) => (): void => {
  if (!ctx.isAiming()) return;
  const s = ctx.slingshot.carrotPosition();
  ctx.setCarrotPos(s);
  ctx.slingshot.drawElasticTo(s);
  const points = computeTrajectoryPoints(s, ctx.slingshot.releaseVelocity());
  const { rabbitIdx, trimAt } = findTargetedHit(ctx.rabbits, points);
  ctx.preview.show(points.slice(0, trimAt));
  updateAimedRabbits(ctx.rabbits, rabbitIdx);
};

export const makeOnRelease =
  (ctx: AimCtx) =>
  (v: Vec): void => {
    ctx.preview.clear();
    ctx.slingshot.clearElastic();
    if (!ctx.isAiming()) {
      updateAimedRabbits(ctx.rabbits, -1);
      return;
    }
    const start = ctx.carrotBodyPos();
    const points = computeTrajectoryPoints(start, v);
    const { rabbitIdx, trimAt } = findTargetedHit(ctx.rabbits, points);
    closeMouthsForRelease(ctx.rabbits, rabbitIdx, trimAt, ctx.delay, ctx.isDestroyed);
    ctx.onLaunch(v);
  };
