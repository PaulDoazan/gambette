import { Container } from 'pixi.js';
import type { Pair, Rng } from '@gambette/math-sdk';
import {
  BUCKET_INSET,
  BUCKET_RADIUS,
  BUCKETS_PER_PLAYER,
  DESIGN_HEIGHT,
  bucketX,
} from '../config/dimensions';
import { START_LEVEL, flightMs } from '../config/water';
import { aimFrom, clampGrip, inHole, type Aim } from '../domain/aim';
import { labelBuckets, pickCalc } from '../domain/quiz';
import { createTouchRouter } from '../domain/touchRouting';
import { PLAYERS, type Player, type Vec } from '../domain/types';
import { createWater } from '../domain/water';
import { createAimGuide } from '../entities/AimGuide';
import { createBeach } from '../entities/Beach';
import { createBucket, type Bucket } from '../entities/Bucket';
import { createCalcBlock, type CalcBlock } from '../entities/CalcBlock';
import { createFish } from '../entities/Fish';
import { createPool, waterRadius } from '../entities/Pool';
import { createPuddle, createWaterShot } from '../entities/Splash';

export interface BucketState {
  value: number;
  empty: boolean;
  position: Vec;
}

export interface GameScene {
  readonly view: Container;
  pointerDown(id: number, p: Vec): void;
  pointerMove(id: number, p: Vec): void;
  pointerUp(id: number): void;
  /** Doigt annulé par le système (geste, appel…) : le seau revient sans tirer. */
  pointerCancel(id: number): void;
  /** Relâche les seaux tenus sans tirer (réglages ouverts, fin de partie). */
  releaseAll(): void;
  calc(player: Player): Pair;
  buckets(player: Player): BucketState[];
  /** Index du seau portant la bonne réponse. */
  correctIndex(player: Player): number;
  level(): number;
  /** Pointillés autour du trou en bleu : au moins un joueur vise le trou. */
  holeHighlighted(): boolean;
  tick(deltaMs: number): void;
  reset(): void;
  destroy(): void;
}

interface Flight {
  from: Vec;
  to: Vec;
  elapsed: number;
  duration: number;
  shot: ReturnType<typeof createWaterShot>;
}

interface Side {
  calc: Pair;
  correct: number;
  buckets: Bucket[];
  block: CalcBlock;
  guide: ReturnType<typeof createAimGuide>;
  held: { index: number; aim: Aim | null } | null;
  /** Eau du bon seau en vol : le joueur attend son nouveau calcul. */
  flight: Flight | null;
}

/** Place du i-ème seau d'un joueur (B en miroir : sa gauche est à droite de l'écran). */
export const bucketHome = (player: Player, i: number): Vec =>
  player === 'A'
    ? { x: bucketX(i), y: DESIGN_HEIGHT - BUCKET_INSET }
    : { x: bucketX(BUCKETS_PER_PLAYER - 1 - i), y: BUCKET_INSET };

const GRAB_RADIUS = BUCKET_RADIUS * 1.3;

export function createGameScene(deps: {
  pairs: readonly Pair[];
  rng?: Rng;
  onWin(): void;
}): GameScene {
  const rng = deps.rng ?? Math.random;
  const view = new Container();
  const beach = createBeach();
  const water = createWater();
  const pool = createPool(START_LEVEL);
  const fish = createFish();
  const ground = new Container(); // flaques, sous les seaux
  ground.label = 'ground';
  const air = new Container(); // eau en vol, au-dessus de tout
  air.label = 'air';
  const effects = new Container();
  effects.label = 'effects';
  view.addChild(beach.view, pool.view, fish.view, ground);

  const sides = {} as Record<Player, Side>;
  for (const pl of PLAYERS) {
    const block = createCalcBlock(pl);
    const buckets = Array.from({ length: BUCKETS_PER_PLAYER }, (_, i) =>
      createBucket(pl, bucketHome(pl, i)),
    );
    const guide = createAimGuide();
    view.addChild(block.view, guide.view, ...buckets.map((b) => b.view));
    effects.addChild(block.sparks, ...buckets.map((b) => b.sparks));
    sides[pl] = {
      calc: deps.pairs[0]!,
      correct: 0,
      buckets,
      block,
      guide,
      held: null,
      flight: null,
    };
  }
  view.addChild(air, effects);

  let puddles: ReturnType<typeof createPuddle>[] = [];
  const addPuddle = (at: Vec, missBy?: Player): void => {
    const p = createPuddle(at, missBy);
    ground.addChild(p.view);
    puddles.push(p);
  };

  const router = createTouchRouter();
  let escaping = false;
  let won = false;

  // Nouveau calcul et 5 seaux pleins ; en cours de partie, un éclat le signale.
  const renew = (pl: Player, flash: boolean): void => {
    const s = sides[pl];
    s.calc = pickCalc(deps.pairs, s.calc, rng);
    s.block.setPair(s.calc);
    const labels = labelBuckets(s.calc, BUCKETS_PER_PLAYER, rng)!;
    s.correct = labels.correctIndex;
    s.buckets.forEach((b, i) => {
      b.setValue(labels.values[i]!);
      b.setEmpty(false);
      b.setPosition(b.home);
      if (flash) b.flash();
    });
    if (flash) s.block.flash();
  };

  // Pointillés du trou en bleu tant qu'au moins un joueur vise dedans.
  const refreshHoleRing = (): void => {
    pool.setAimOnTarget(PLAYERS.some((pl) => sides[pl].guide.onTarget()));
  };

  const drop = (pl: Player): void => {
    const s = sides[pl];
    if (!s.held) return;
    const b = s.buckets[s.held.index]!;
    b.setPosition(b.home);
    s.guide.hide();
    refreshHoleRing();
    s.held = null;
  };

  const release = (pl: Player): void => {
    const s = sides[pl];
    const held = s.held;
    if (!held) return;
    const bucket = s.buckets[held.index]!;
    drop(pl);
    if (!held.aim) return;
    if (held.index !== s.correct) {
      // Mauvais seau : il se vide sur place, sans remplir le trou.
      bucket.spill();
      addPuddle(bucket.home);
      return;
    }
    bucket.setEmpty(true);
    const shot = createWaterShot();
    air.addChild(shot.view);
    s.flight = {
      from: bucket.home,
      to: held.aim.target,
      elapsed: 0,
      duration: flightMs(held.aim.range),
      shot,
    };
    shot.update(s.flight.from, s.flight.to, 0);
  };

  const land = (pl: Player): void => {
    const s = sides[pl];
    const f = s.flight!;
    s.flight = null;
    f.shot.view.destroy({ children: true });
    if (inHole(f.to)) {
      water.pour();
      pool.ripple(f.to);
    } else {
      addPuddle(f.to, pl);
    }
    if (!escaping) renew(pl, true);
  };

  const pick = (pl: Player, p: Vec): number => {
    const s = sides[pl];
    let best = -1;
    let bestD = GRAB_RADIUS;
    s.buckets.forEach((b, i) => {
      if (b.isEmpty()) return;
      const d = Math.hypot(b.home.x - p.x, b.home.y - p.y);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  const releaseAll = (): void => {
    for (const pl of PLAYERS) drop(pl);
    router.reset();
  };

  const startAll = (): void => {
    for (const pl of PLAYERS) renew(pl, false);
  };
  startAll();

  return {
    view,
    pointerDown: (id, p) => {
      if (escaping) return;
      const pl = router.begin(id, p.y);
      if (!pl) return;
      const s = sides[pl];
      const index = s.flight ? -1 : pick(pl, p);
      if (index < 0) {
        router.end(id);
        return;
      }
      s.held = { index, aim: null };
    },
    pointerMove: (id, p) => {
      const pl = router.owner(id);
      const s = pl ? sides[pl] : null;
      if (!s?.held) return;
      const b = s.buckets[s.held.index]!;
      const grip = clampGrip(b.home, p);
      b.setPosition(grip);
      s.held.aim = aimFrom(b.home, grip);
      s.guide.show(b.home, grip, s.held.aim);
      refreshHoleRing();
    },
    pointerUp: (id) => {
      const pl = router.owner(id);
      router.end(id);
      if (pl) release(pl);
    },
    pointerCancel: (id) => {
      const pl = router.owner(id);
      router.end(id);
      if (pl) drop(pl);
    },
    releaseAll,
    calc: (pl) => sides[pl].calc,
    buckets: (pl) =>
      sides[pl].buckets.map((b) => ({
        value: b.value(),
        empty: b.isEmpty(),
        position: b.position(),
      })),
    correctIndex: (pl) => sides[pl].correct,
    level: () => water.level(),
    holeHighlighted: () => pool.aimOnTarget(),
    tick: (deltaMs) => {
      for (const pl of PLAYERS) {
        const s = sides[pl];
        if (s.flight) {
          s.flight.elapsed += deltaMs;
          const t = s.flight.elapsed / s.flight.duration;
          s.flight.shot.update(s.flight.from, s.flight.to, t);
          if (t >= 1) land(pl);
        }
        s.block.update(deltaMs);
        for (const b of s.buckets) b.update(deltaMs);
      }
      water.update(deltaMs);
      pool.update(water.level(), deltaMs);
      fish.update(deltaMs, pool.shownLevel(), waterRadius(pool.shownLevel()));
      puddles = puddles.filter((p) => {
        if (p.update(deltaMs)) return true;
        p.view.destroy({ children: true });
        return false;
      });
      if (water.full() && !escaping) {
        // L'eau atteint le canal : plus de tir, le poisson s'en va, puis l'écran de victoire.
        escaping = true;
        releaseAll();
        pool.overflow();
        fish.escape(() => {
          if (won) return;
          won = true;
          deps.onWin();
        });
      }
    },
    reset: () => {
      releaseAll();
      for (const pl of PLAYERS) {
        const f = sides[pl].flight;
        f?.shot.view.destroy({ children: true });
        sides[pl].flight = null;
      }
      for (const p of puddles) p.view.destroy({ children: true });
      puddles = [];
      water.reset();
      pool.reset(water.level());
      fish.reset();
      escaping = false;
      won = false;
      startAll();
    },
    destroy: () => {
      releaseAll();
      view.destroy({ children: true });
    },
  };
}
