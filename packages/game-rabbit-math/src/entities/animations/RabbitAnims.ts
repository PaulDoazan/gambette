import { Container, Graphics } from 'pixi.js';
import { Tween } from '@tweenjs/tween.js';
import { tweenGroup, tweenObject } from './Tween';
import { TREE_TRUNK_X } from '../../config/dimensions';

export interface AnimTarget {
  view: Container;
  position: { x: number; y: number };
  openMouth: Graphics;
}

const MOUTH_TWEEN_MS = 90;
const CHEW_OPEN_MS = MOUTH_TWEEN_MS;
const CHEW_CLOSE_MS = 220;
const CHEW_PAUSE_MS = 160;

const tweenWait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    new Tween({ t: 0 }, tweenGroup)
      .to({ t: 1 }, ms)
      .onComplete(() => resolve())
      .start();
  });

export const animateShakeNo = async (view: Container, originalX: number): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await tweenObject(view.position, { x: originalX + 6 }, 60);
    await tweenObject(view.position, { x: originalX - 6 }, 60);
  }
  view.position.x = originalX;
};

export const animateChew = async (target: AnimTarget, times: number): Promise<void> => {
  target.openMouth.scale.set(1, 0);
  for (let i = 0; i < times; i++) {
    await tweenObject(target.openMouth.scale, { y: 1 }, CHEW_OPEN_MS);
    await tweenObject(target.openMouth.scale, { y: 0 }, CHEW_CLOSE_MS);
    if (i < times - 1) await tweenWait(CHEW_PAUSE_MS);
  }
};

const JUMP_PEAK_LIFT = 60;
const JUMP_FORWARD_DISTANCE = 36;
const JUMP_DURATION_MS = 620;
const LAND_SQUASH_MS = 110;
const LAND_RECOVER_MS = 160;

interface ArcPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  peakY: number;
}

const stepAlongArc = (view: Container, p: ArcPath, t: number): void => {
  const oneMinus = 1 - t;
  view.position.x = p.startX + (p.endX - p.startX) * t;
  view.position.y = oneMinus * oneMinus * p.startY + 2 * oneMinus * t * p.peakY + t * t * p.endY;
};

const tweenAlongArc = (view: Container, path: ArcPath, ms: number): Promise<void> =>
  new Promise((resolve) => {
    new Tween({ t: 0 }, tweenGroup)
      .to({ t: 1 }, ms)
      .onUpdate((obj) => stepAlongArc(view, path, obj.t))
      .onComplete(() => resolve())
      .start();
  });

const computeJumpArc = (startX: number, startY: number, landingY: number): ArcPath => ({
  startX,
  startY,
  endX: startX + (startX < TREE_TRUNK_X ? -1 : 1) * JUMP_FORWARD_DISTANCE,
  endY: landingY,
  peakY: Math.min(startY, landingY) - JUMP_PEAK_LIFT,
});

const playLanding = async (view: Container): Promise<void> => {
  await tweenObject(view.scale, { x: 1.22, y: 0.78 }, LAND_SQUASH_MS);
  await tweenObject(view.scale, { x: 1, y: 1 }, LAND_RECOVER_MS);
};

export const animateJumpFromTree = async (target: AnimTarget, landingY: number): Promise<void> => {
  target.openMouth.scale.set(1, 0);
  const path = computeJumpArc(target.view.position.x, target.view.position.y, landingY);
  await tweenObject(target.view.scale, { x: 1.18, y: 0.78 }, 130);
  void tweenObject(target.view.scale, { x: 0.92, y: 1.1 }, 220);
  await tweenAlongArc(target.view, path, JUMP_DURATION_MS);
  target.position.x = path.endX;
  target.position.y = landingY;
  target.view.position.set(path.endX, landingY);
  await playLanding(target.view);
};

export const animateHopInPlace = async (target: AnimTarget): Promise<void> => {
  const baseY = target.position.y;
  for (let i = 0; i < 3; i++) {
    await tweenObject(target.view.position, { y: baseY - 22 }, 180);
    await tweenObject(target.view.position, { y: baseY }, 160);
  }
};

export const animateRunAwayRight = async (
  target: AnimTarget,
  offscreenX: number,
): Promise<void> => {
  target.position.x = offscreenX;
  await tweenObject(target.view.position, { x: offscreenX }, 1000);
};
