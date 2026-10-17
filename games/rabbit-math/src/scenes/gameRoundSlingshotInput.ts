import type { Container, FederatedPointerEvent } from 'pixi.js';
import type { Carrot } from '../entities/Carrot';
import type { Slingshot } from '../entities/Slingshot';
import type { SlingshotInput } from '../systems/SlingshotInput';
import type { Session } from '../domain/Session';

export interface Vec {
  x: number;
  y: number;
}

export interface SlingshotEventDeps {
  view: Container;
  slingshot: Slingshot;
  session: Session;
  input: SlingshotInput;
  carrot: () => Carrot;
}

const HIT_RADIUS_SQ = 30 * 30;

const within = (p: Vec, t: Vec): boolean => {
  const dx = p.x - t.x;
  const dy = p.y - t.y;
  return dx * dx + dy * dy <= HIT_RADIUS_SQ;
};

const downHandler =
  (deps: SlingshotEventDeps) =>
  (e: FederatedPointerEvent): void => {
    if (deps.session.snapshot().phase !== 'aiming') return;
    const p = { x: e.global.x, y: e.global.y };
    if (!within(p, deps.slingshot.carrotPosition())) return;
    deps.input.handlePointerDown(p);
  };

export const wireSlingshotEvents = (deps: SlingshotEventDeps): (() => void) => {
  const down = downHandler(deps);
  const move = (e: FederatedPointerEvent): void =>
    deps.input.handlePointerMove({ x: e.global.x, y: e.global.y });
  const up = (): void => deps.input.handlePointerUp();
  deps.view
    .on('pointerdown', down)
    .on('pointermove', move)
    .on('pointerup', up)
    .on('pointerupoutside', up);
  return () =>
    deps.view
      .off('pointerdown', down)
      .off('pointermove', move)
      .off('pointerup', up)
      .off('pointerupoutside', up);
};
