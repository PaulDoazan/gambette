import { Container } from 'pixi.js';
import type { Pair, Rng } from '@gambette/math-sdk';
import {
  BUCKET_INSET,
  BUCKET_RADIUS,
  BUCKETS_PER_PLAYER,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  bucketX,
} from '../config/dimensions';
import { LAST_ROUND, PAN_MS, ROUNDS, UI_FADE_MS } from '../config/rounds';
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
import { createWaterFx } from '../entities/WaterFx';
import { createPool, waterRadius } from '../entities/Pool';
import { createPuddle, createWaterShot } from '../entities/Splash';
import { createSea } from '../entities/Sea';

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
  /** Manche en cours (0 à LAST_ROUND). */
  round(): number;
  /** Seaux et calculs affichés et jouables (faux pendant une fin de manche). */
  uiVisible(): boolean;
  /** Décalage horizontal de la caméra dans le monde des trois écrans. */
  cameraX(): number;
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
  /** Sélection de calculs de chaque joueur. */
  pairs: Record<Player, readonly Pair[]>;
  rng?: Rng;
  onWin(): void;
  /** L'interface s'efface (fin de manche) ou revient (manche suivante). */
  onUiHidden?(hidden: boolean): void;
}): GameScene {
  const rng = deps.rng ?? Math.random;
  const view = new Container();
  // Monde des trois écrans (sable, trous, eau, mer, poisson), que la caméra fait défiler ; par-dessus,
  // l'interface fixe à l'écran (seaux, calculs, visées, flaques, eau en vol), qui s'efface en fin
  // de manche.
  const world = new Container();
  world.label = 'world';
  const beach = createBeach();
  const sea = createSea();
  const water = createWater(ROUNDS[0]!);
  const pools = ROUNDS.map((_, k) => createPool(k, START_LEVEL));
  const fish = createFish();
  // Tout ce qui est dans l'eau ondule ensemble : fond des trous, poisson, surface, canaux, mer.
  const aquatic = new Container();
  aquatic.label = 'aquatic';
  aquatic.addChild(
    sea.view,
    ...pools.map((p) => p.floor),
    fish.shadow,
    fish.view,
    ...pools.map((p) => p.view),
  );
  const waterFx = createWaterFx(aquatic, world);
  world.addChild(beach.view, aquatic, ...pools.map((p) => p.marks));
  const ui = new Container();
  ui.label = 'ui';
  const ground = new Container(); // flaques, sous les seaux
  ground.label = 'ground';
  const air = new Container(); // eau en vol, au-dessus de tout
  air.label = 'air';
  const effects = new Container();
  effects.label = 'effects';
  ui.addChild(ground);
  view.addChild(world, ui);

  const sides = {} as Record<Player, Side>;
  for (const pl of PLAYERS) {
    const block = createCalcBlock(pl);
    const buckets = Array.from({ length: BUCKETS_PER_PLAYER }, (_, i) =>
      createBucket(pl, bucketHome(pl, i)),
    );
    const guide = createAimGuide();
    ui.addChild(block.view, guide.view, ...buckets.map((b) => b.view));
    effects.addChild(block.sparks, ...buckets.map((b) => b.sparks));
    sides[pl] = {
      calc: deps.pairs[pl][0]!,
      correct: 0,
      buckets,
      block,
      guide,
      held: null,
      flight: null,
    };
  }
  ui.addChild(air, effects);

  let puddles: ReturnType<typeof createPuddle>[] = [];
  const addPuddle = (at: Vec, missBy?: Player): void => {
    const p = createPuddle(at, missBy);
    ground.addChild(p.view);
    puddles.push(p);
  };

  const router = createTouchRouter();
  let won = false;
  let round = 0;
  let camera = 0;
  /**
   * `playing` : on joue. `leaving` : l'interface s'efface, le poisson gagne le trou suivant et la
   * caméra le suit. `arriving` : l'interface revient. `finale` : le poisson rejoint la mer.
   */
  let phase: 'playing' | 'leaving' | 'arriving' | 'finale' = 'playing';
  let phaseMs = 0;
  const pool = (): ReturnType<typeof createPool> => pools[round]!;
  const holeRadius = (): number => ROUNDS[round]!.holeRadius;
  const setCamera = (x: number): void => {
    camera = x;
    world.x = -x;
  };

  // Nouveau calcul et 5 seaux pleins ; en cours de partie, un éclat le signale.
  const renew = (pl: Player, flash: boolean): void => {
    const s = sides[pl];
    s.calc = pickCalc(deps.pairs[pl], s.calc, rng);
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
    pool().setAimOnTarget(PLAYERS.some((pl) => sides[pl].guide.onTarget()));
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
    // En fin de manche, l'eau encore en vol ne compte plus.
    if (phase !== 'playing') return;
    if (inHole(f.to, holeRadius())) {
      water.pour();
      pool().ripple({ x: f.to.x + camera, y: f.to.y });
      waterFx.splash({ x: f.to.x + camera, y: f.to.y });
    } else {
      addPuddle(f.to, pl);
    }
    renew(pl, true);
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

  const clearFlights = (): void => {
    for (const pl of PLAYERS) {
      sides[pl].flight?.shot.view.destroy({ children: true });
      sides[pl].flight = null;
    }
  };
  const clearPuddles = (): void => {
    for (const p of puddles) p.view.destroy({ children: true });
    puddles = [];
  };

  // L'eau atteint le canal : plus de tir, l'interface s'efface, le poisson s'en va.
  const endRound = (): void => {
    releaseAll();
    pool().overflow();
    deps.onUiHidden?.(true);
    phaseMs = 0;
    if (round < LAST_ROUND) {
      phase = 'leaving';
      fish.escape(round, () => {
        // Arrivé dans le trou suivant : nouvelle manche, l'interface revient.
        clearFlights();
        round += 1;
        setCamera(round * DESIGN_WIDTH);
        water.reset(ROUNDS[round]!);
        startAll();
        phase = 'arriving';
        phaseMs = 0;
      });
    } else {
      phase = 'finale';
      fish.escape(round, () => {
        if (won) return;
        won = true;
        deps.onWin();
      });
    }
  };

  const updatePhase = (deltaMs: number): void => {
    if (phase === 'playing') return;
    phaseMs += deltaMs;
    if (phase === 'arriving') {
      ui.alpha = Math.min(1, phaseMs / UI_FADE_MS);
      if (ui.alpha >= 1) {
        phase = 'playing';
        deps.onUiHidden?.(false);
      }
      return;
    }
    ui.alpha = Math.max(0, 1 - phaseMs / UI_FADE_MS);
    if (ui.alpha === 0 && puddles.length > 0) clearPuddles();
    if (phase === 'leaving') {
      // Le canal se vide derrière le poisson ; la caméra le suit sans jamais reculer.
      if (phaseMs >= 0.45 * PAN_MS) pool().drain();
      const from = round * DESIGN_WIDTH;
      const target = Math.min(
        from + DESIGN_WIDTH,
        Math.max(from, fish.position().x - DESIGN_WIDTH / 2),
      );
      setCamera(Math.max(camera, target));
    }
  };

  return {
    view,
    pointerDown: (id, p) => {
      if (phase !== 'playing') return;
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
      s.guide.show(b.home, grip, s.held.aim, holeRadius());
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
    holeHighlighted: () => pool().aimOnTarget(),
    round: () => round,
    uiVisible: () => phase === 'playing',
    cameraX: () => camera,
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
      // Pas d'infiltration tant que les joueurs ne peuvent pas tirer.
      if (phase === 'playing') water.update(deltaMs);
      pools.forEach((p, k) => {
        // Trous déjà quittés : pleins ; trous à venir : leur fond d'eau de départ.
        p.update(k < round ? 1 : k > round ? START_LEVEL : water.level(), deltaMs);
      });
      sea.update(deltaMs);
      waterFx.update(deltaMs);
      const shown = pool().shownLevel();
      fish.update(deltaMs, shown, waterRadius(shown, round));
      puddles = puddles.filter((p) => {
        if (p.update(deltaMs)) return true;
        p.view.destroy({ children: true });
        return false;
      });
      if (phase === 'playing' && water.full()) endRound();
      updatePhase(deltaMs);
    },
    reset: () => {
      releaseAll();
      clearFlights();
      clearPuddles();
      round = 0;
      setCamera(0);
      water.reset(ROUNDS[0]!);
      for (const p of pools) p.reset(START_LEVEL);
      fish.reset();
      phase = 'playing';
      ui.alpha = 1;
      won = false;
      startAll();
    },
    destroy: () => {
      releaseAll();
      view.destroy({ children: true });
    },
  };
}
