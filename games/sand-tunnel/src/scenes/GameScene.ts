import { Container } from 'pixi.js';
import { opSymbol, type Pair, type Rng } from '@gambette/math-sdk';
import {
  DESIGN_WIDTH,
  GALLERY_WIDTH,
  LAST_SCREEN,
  NODE_RADIUS,
  SCREENS,
  channelOf,
} from '../config/dimensions';
import {
  FLOW_RAMP_MS,
  FLOW_SPEED,
  RECEDE_SPEED,
  REFILL_MS,
  RETRACT_SPEED,
  SWIM_SPEED,
  UI_FADE_MS,
} from '../config/timing';
import { createDig, judge, posOf, type Dig, type Lead } from '../domain/dig';
import { POND, generateNetwork, type Network } from '../domain/network';
import { pickCalc } from '../domain/quiz';
import { lengthTo, routeLength } from '../domain/route';
import type { Vec } from '../domain/types';
import { createBeach } from '../entities/Beach';
import { createFish, type Fish } from '../entities/Fish';
import { createNetworkView, type NetworkView } from '../entities/NetworkView';
import { createPond, type Pond } from '../entities/Pond';
import { createResultPanel } from '../entities/ResultPanel';
import { SAND_FALL_MS, createSandFall, type SandFall } from '../entities/SandFall';
import { createSea } from '../entities/Sea';
import { createWaterFx, type WaterFx } from '../entities/WaterFx';
import { createWaterRun, type WaterRun } from '../entities/WaterRun';

/**
 * `play` : on creuse. `flow` : l'eau s'engouffre dans la galerie. `blocked` : le sable s'effondre
 * sur les galets fautifs. `recede` : l'eau reflue vers la mare. `refill` : une galerie inachevée
 * se rebouche. `leave` : le poisson file vers le réseau suivant, la caméra le suit. `arrive` :
 * l'interface revient. `won` : le poisson a rejoint la mer.
 */
export type Phase = 'play' | 'flow' | 'blocked' | 'recede' | 'refill' | 'leave' | 'arrive' | 'won';

export interface GameScene {
  readonly view: Container;
  /** Positions à l'écran (le monde défile sous l'écran). */
  pointerDown(id: number, p: Vec): void;
  pointerMove(id: number, p: Vec): void;
  pointerUp(id: number): void;
  /** Doigt annulé par le système : la galerie se rebouche sans vérifier. */
  pointerCancel(id: number): void;
  /** Abandonne le geste en cours (réglages ouverts). */
  releaseAll(): void;
  /** Réseau en cours (0 à LAST_SCREEN), et son contenu. */
  screen(): number;
  network(): Network;
  phase(): Phase;
  /** Galets creusés pendant le geste en cours. */
  dug(): readonly number[];
  resultText(): string;
  cameraX(): number;
  /** Panneau du résultat affiché et jeu jouable. */
  uiVisible(): boolean;
  tick(deltaMs: number): void;
  reset(): void;
  destroy(): void;
}

interface World {
  readonly container: Container;
  readonly networks: Network[];
  readonly views: NetworkView[];
  readonly ponds: Pond[];
  readonly fish: Fish;
  readonly runs: Container;
  readonly fx: Container;
  readonly waterFx: WaterFx;
  readonly sea: ReturnType<typeof createSea>;
}

/** Labels du calcul creusé, pour le panneau. */
const partsOf = (net: Network, path: readonly number[]): string[] =>
  path.map((id) => {
    const n = net.nodes[id]!;
    return n.kind === 'op' ? opSymbol(n.op) : String(n.value);
  });

export function createGameScene(deps: {
  pairs: readonly Pair[];
  rng?: Rng;
  onWin(): void;
  /** L'interface s'efface (transition vers le réseau suivant) ou revient. */
  onUiHidden?(hidden: boolean): void;
}): GameScene {
  const rng = deps.rng ?? Math.random;
  const view = new Container();
  const panel = createResultPanel();
  const ui = new Container();
  ui.label = 'ui';
  ui.addChild(panel.view);

  const buildWorld = (): World => {
    const container = new Container();
    container.label = 'world';
    let previous: Pair | null = null;
    // Les opérateurs proposés sont ceux des calculs choisis : que des × pour les tables de ×.
    const ops = [...new Set(deps.pairs.map((p) => p.op))];
    const networks = Array.from({ length: SCREENS }, (_, k) => {
      previous = pickCalc(deps.pairs, previous, rng);
      return generateNetwork(previous, k, rng, ops);
    });
    const views = networks.map((n) => createNetworkView(n));
    const ponds = networks.map((n, k) => createPond(n.pond, 11 + k));
    const fish = createFish(networks[0]!.pond);
    const sea = createSea();
    const runs = new Container();
    runs.label = 'water-runs';
    // Tout ce qui est dans l'eau ondule ensemble ; les ondes de choc ne touchent que les mares.
    const wet = new Container();
    wet.label = 'wet';
    wet.addChild(...ponds.map((p) => p.floor), runs, fish.shadow, fish.view);
    wet.addChild(...ponds.map((p) => p.view));
    const aquatic = new Container();
    aquatic.label = 'aquatic';
    aquatic.addChild(sea.view, wet);
    const waterFx = createWaterFx(aquatic, wet);
    const fx = new Container();
    fx.label = 'sand-falls';
    container.addChild(
      createBeach().view,
      ...views.map((v) => v.ground),
      aquatic,
      ...views.map((v) => v.stones),
      fx,
    );
    return { container, networks, views, ponds, fish, runs, fx, waterFx, sea };
  };

  let world = buildWorld();
  view.addChild(world.container, ui);

  let screen = 0;
  let camera = 0;
  let phase: Phase = 'play';
  let phaseMs = 0;
  let pointer: number | null = null;
  let dig: Dig = createDig(world.networks[0]!);
  let falls: SandFall[] = [];
  /** Eau des galeries déjà franchies. */
  let crossed: WaterRun[] = [];
  /** Eau en cours dans la galerie (et le canal, sur un bon chemin). */
  let run: WaterRun | null = null;
  let galleryRoute: Vec[] = [];
  /** Bout de galerie affiché au-delà du dernier galet : il suit le doigt, et se retire en douceur. */
  let shown: (Lead & { readonly tip: number }) | null = null;
  /** Distance jusqu'où l'eau doit aller, et celle où le sable bouche la galerie. */
  let flowTarget = 0;
  let blockAt = 0;
  let wrongNodes: number[] = [];
  let won = false;

  const net = (): Network => world.networks[screen]!;
  const netView = (): NetworkView => world.views[screen]!;
  const setCamera = (x: number): void => {
    camera = x;
    world.container.x = -x;
  };
  const showPanel = (path: readonly number[] = []): void =>
    panel.show(net().result, partsOf(net(), path));
  const toWorld = (p: Vec): Vec => ({ x: p.x + camera, y: p.y });
  const setPhase = (p: Phase): void => {
    phase = p;
    phaseMs = 0;
  };

  const resetNodes = (): void => {
    for (const n of net().nodes) netView().setNodeState(n.id, 'idle');
  };

  /** Rapproche le bout affiché de celui que vise le doigt : il avance aussitôt, recule en douceur. */
  const followLead = (dtMs: number): void => {
    const path = dig.path();
    const tip = path.length > 0 ? path[path.length - 1]! : POND;
    const target = dig.lead();
    if (!shown || shown.tip !== tip) {
      shown = target && { ...target, tip };
      return;
    }
    const back = Math.max(0, shown.len - RETRACT_SPEED * dtMs);
    if (target && target.toward === shown.toward) {
      shown = { ...shown, len: Math.max(target.len, back) };
    } else if (back > 0) {
      shown = { ...shown, len: back };
    } else {
      shown = target && { ...target, tip };
    }
  };

  /** Galerie de la mare aux galets creusés, prolongée le long du sillon que suit le doigt. */
  const drawDig = (dtMs = 0): void => {
    followLead(dtMs);
    const path = dig.path();
    const route = [net().pond, ...path.map((id) => net().nodes[id]!.pos)];
    if (shown && shown.len > 0) {
      const from = route[route.length - 1]!;
      const to = posOf(net(), shown.toward);
      const k = shown.len / Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
      const tip = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      // En arrière vers le galet précédent : la galerie raccourcit.
      const previous = path.length >= 2 ? path[path.length - 2]! : POND;
      if (path.length > 0 && shown.toward === previous) route.pop();
      route.push(tip);
    }
    netView().setGallery(route);
    for (const n of net().nodes) {
      netView().setNodeState(n.id, path.includes(n.id) ? 'dug' : 'idle');
    }
    showPanel(path);
  };

  const clearRun = (): void => {
    run?.view.destroy({ children: true });
    run = null;
  };

  const startRun = (route: Vec[]): void => {
    clearRun();
    run = createWaterRun(route, GALLERY_WIDTH - 10);
    run.setRushing(true);
    world.runs.addChild(run.view);
    const pond = net().pond;
    world.ponds[screen]!.ripple(pond);
    world.waterFx.splash(pond);
  };

  /** Lever du doigt : on vérifie la galerie. */
  const release = (): void => {
    const path = dig.end();
    pointer = null;
    shown = null;
    const verdict = judge(net(), path);
    const at = path.map((id) => net().nodes[id]!.pos);
    galleryRoute = [net().pond, ...at];
    if (verdict.kind === 'incomplete') {
      netView().setGallery(galleryRoute);
      setPhase('refill');
      return;
    }
    if (verdict.kind === 'correct') {
      galleryRoute.push(net().exit);
      netView().setGallery(galleryRoute);
      panel.flash('right');
      // L'eau file dans la galerie, puis dans le canal jusqu'à la mare suivante (ou la mer).
      startRun([...galleryRoute, ...channelOf(screen).slice(1)]);
      flowTarget = run!.length;
      blockAt = routeLength(galleryRoute);
      setPhase('flow');
      return;
    }
    wrongNodes = verdict.wrong.map((i) => path[i]!);
    // L'eau s'arrête juste avant le premier galet fautif.
    const first = Math.min(...verdict.wrong);
    blockAt = Math.max(0, lengthTo(galleryRoute, first + 1) - NODE_RADIUS - 8);
    flowTarget = blockAt;
    netView().setGallery(galleryRoute);
    startRun(galleryRoute);
    setPhase('flow');
  };

  const leave = (): void => {
    setPhase('leave');
    deps.onUiHidden?.(true);
    for (const id of net().solution) netView().setNodeState(id, 'wet');
    const route = [...galleryRoute.slice(1), ...channelOf(screen).slice(1)];
    const duration = routeLength([world.fish.position(), ...route]) / SWIM_SPEED;
    world.fish.follow(route, duration, () => {
      if (screen === LAST_SCREEN) {
        setPhase('won');
        if (!won) {
          won = true;
          deps.onWin();
        }
        return;
      }
      // Le poisson est dans la mare suivante : le réseau suivant devient jouable.
      // L'eau reste dans la galerie franchie, et son écume continue de filer.
      if (run) crossed.push(run);
      run = null;
      screen += 1;
      world.fish.swimIn(net().pond);
      setCamera(screen * DESIGN_WIDTH);
      dig = createDig(net());
      showPanel();
      setPhase('arrive');
    });
  };

  const updateFlow = (dtMs: number): void => {
    if (!run) return;
    const ramp = Math.min(1, 0.3 + phaseMs / FLOW_RAMP_MS);
    run.setFront(run.front() + FLOW_SPEED * ramp * dtMs);
    const correct = wrongNodes.length === 0;
    if (correct) {
      if (phase === 'flow' && run.front() >= blockAt) leave();
      if (run.front() >= flowTarget) run.setRushing(false);
      return;
    }
    if (run.front() >= flowTarget) {
      run.setFront(flowTarget);
      run.setRushing(false);
      // Le sable s'effondre sur les galets fautifs : l'eau ne passe pas.
      for (const id of wrongNodes) {
        const fall = createSandFall(net().nodes[id]!.pos, NODE_RADIUS + 12, rng);
        world.fx.addChild(fall.view);
        falls.push(fall);
        netView().shake(id);
      }
      panel.flash('wrong');
      setPhase('blocked');
    }
  };

  const backToPlay = (): void => {
    clearRun();
    wrongNodes = [];
    galleryRoute = [];
    netView().setGallery([]);
    resetNodes();
    showPanel();
    setPhase('play');
  };

  const updatePhase = (dtMs: number): void => {
    phaseMs += dtMs;
    switch (phase) {
      case 'flow':
        updateFlow(dtMs);
        break;
      case 'leave': {
        updateFlow(dtMs);
        ui.alpha = Math.max(0, 1 - phaseMs / UI_FADE_MS);
        // La caméra suit le poisson sans jamais reculer, jusqu'à l'écran suivant.
        const from = screen * DESIGN_WIDTH;
        const target = Math.min(
          from + DESIGN_WIDTH,
          Math.max(from, world.fish.position().x - DESIGN_WIDTH / 2),
        );
        if (screen < LAST_SCREEN) setCamera(Math.max(camera, target));
        break;
      }
      case 'arrive':
        ui.alpha = Math.min(1, phaseMs / UI_FADE_MS);
        if (ui.alpha >= 1) {
          setPhase('play');
          deps.onUiHidden?.(false);
        }
        break;
      case 'blocked':
        netView().setGallery(galleryRoute, blockAt, phaseMs / REFILL_MS);
        if (phaseMs >= SAND_FALL_MS) setPhase('recede');
        break;
      case 'recede':
        netView().setGallery(galleryRoute, blockAt, 1);
        run?.setFront(run.front() - RECEDE_SPEED * dtMs);
        if (!run || run.front() <= 0) backToPlay();
        break;
      case 'refill':
        netView().setGallery(galleryRoute, 0, phaseMs / REFILL_MS);
        if (phaseMs >= REFILL_MS) backToPlay();
        break;
      default:
        break;
    }
  };

  const abandon = (): void => {
    if (pointer === null) return;
    pointer = null;
    shown = null;
    dig.end();
    if (phase === 'play') backToPlay();
  };

  const start = (): void => {
    screen = 0;
    setCamera(0);
    dig = createDig(net());
    falls = [];
    crossed = [];
    run = null;
    wrongNodes = [];
    galleryRoute = [];
    shown = null;
    pointer = null;
    won = false;
    ui.alpha = 1;
    showPanel();
    setPhase('play');
  };
  start();

  return {
    view,
    pointerDown: (id, p) => {
      if (phase !== 'play' || pointer !== null) return;
      if (!dig.begin(toWorld(p))) return;
      pointer = id;
      drawDig();
    },
    pointerMove: (id, p) => {
      if (id !== pointer || phase !== 'play') return;
      dig.move(toWorld(p));
      drawDig();
    },
    pointerUp: (id) => {
      if (id !== pointer) return;
      if (phase !== 'play') {
        abandon();
        return;
      }
      release();
    },
    pointerCancel: (id) => {
      if (id === pointer) abandon();
    },
    releaseAll: abandon,
    screen: () => screen,
    network: net,
    phase: () => phase,
    dug: () => dig.path(),
    resultText: () => panel.text(),
    cameraX: () => camera,
    uiVisible: () => phase !== 'leave' && phase !== 'arrive' && phase !== 'won',
    tick: (deltaMs) => {
      updatePhase(deltaMs);
      if (phase === 'play' && dig.active()) drawDig(deltaMs);
      world.fish.update(deltaMs);
      for (const p of world.ponds) p.update(deltaMs);
      for (const v of world.views) v.update(deltaMs);
      run?.update(deltaMs);
      for (const r of crossed) r.update(deltaMs);
      world.sea.update(deltaMs);
      world.waterFx.update(deltaMs);
      panel.update(deltaMs);
      falls = falls.filter((f) => {
        if (f.update(deltaMs)) return true;
        f.view.destroy({ children: true });
        return false;
      });
    },
    reset: () => {
      view.removeChild(world.container);
      world.container.destroy({ children: true });
      world = buildWorld();
      view.addChildAt(world.container, 0);
      start();
    },
    destroy: () => {
      view.destroy({ children: true });
    },
  };
}
