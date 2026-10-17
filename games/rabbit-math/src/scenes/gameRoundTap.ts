import type { Container, FederatedPointerEvent } from 'pixi.js';
import type { Carrot } from '../entities/Carrot';
import type { Rabbit } from '../entities/Rabbit';
import type { Slingshot } from '../entities/Slingshot';
import type { Session } from '../domain/Session';
import { findTapVelocity } from '../systems/AccessibleTapMode';

export interface Vec {
  x: number;
  y: number;
}

export interface TapEventDeps {
  view: Container;
  rabbits: readonly Rabbit[];
  slingshot: Slingshot;
  session: Session;
  carrot: () => Carrot;
  isResolving: () => boolean;
  isBouncing: () => boolean;
  setTapTarget: (idx: number | null) => void;
}

const findTappedRabbit = (rabbits: readonly Rabbit[], p: Vec): number => {
  for (let i = 0; i < rabbits.length; i++) {
    const r = rabbits[i]!;
    if (r.isFallen()) continue;
    const a = r.getCollisionAabb();
    if (p.x >= a.minX && p.x <= a.maxX && p.y >= a.minY && p.y <= a.maxY) return i;
  }
  return -1;
};

const tapHandler =
  (deps: TapEventDeps) =>
  (e: FederatedPointerEvent): void => {
    if (deps.session.snapshot().phase !== 'aiming') return;
    if (deps.isResolving() || deps.isBouncing() || deps.carrot().isLaunched()) return;
    const p = { x: e.global.x, y: e.global.y };
    const idx = findTappedRabbit(deps.rabbits, p);
    if (idx < 0) return;
    const target = deps.rabbits[idx]!;
    deps.rabbits.forEach((r, i) => r.setAimed(i === idx));
    deps.setTapTarget(idx);
    const v = findTapVelocity(deps.slingshot.carrotPosition(), target.position);
    deps.carrot().launch(v);
  };

export const wireTapEvents = (deps: TapEventDeps): (() => void) => {
  const down = tapHandler(deps);
  deps.view.on('pointerdown', down);
  return () => deps.view.off('pointerdown', down);
};
