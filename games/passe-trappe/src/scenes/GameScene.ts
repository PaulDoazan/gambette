import { Container } from 'pixi.js';
import { computeAnswer, type Pair, type Rng } from '@gambette/math-sdk';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import { createBoard } from '../entities/Board';
import { createElastic, type Elastic } from '../entities/Elastic';
import { createCalcBlock, type CalcBlock } from '../entities/CalcBlock';
import { createPuck, type Puck } from '../entities/Puck';
import { createDragController, type DragController } from '../input/DragController';
import {
  CALC_BLOCK_SIZE,
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MID_Y,
  PUCK_RADIUS,
  PUCK_SPACING,
} from '../config/dimensions';
import { elasticLine, stretchOf } from '../domain/elastic';
import { campOf, createWinDetector } from '../domain/rules';
import { createCrossingDetector } from '../domain/crossings';
import { labelCamp, pickCalc } from '../domain/quiz';
import { PLAYERS, type Player, type Vec } from '../domain/types';

export interface GameScene {
  readonly view: Container;
  readonly drag: DragController;
  pucks(): readonly Puck[];
  calc(player: Player): Pair;
  isCorrect(puck: Puck): boolean;
  tick(deltaMs: number): void;
  reset(): void;
  destroy(): void;
}

/**
 * Disposition de départ. Jusqu'à 5 palets : une rangée à mi-chemin entre la cloison et
 * l'élastique. Au-delà : deux rangées (ceil(n/2) côté cloison, floor(n/2) côté élastique),
 * la seconde décalée d'un demi-pas si les deux rangées ont le même nombre de palets.
 * La rangée avant est posée juste derrière le bloc de calcul du camp : aucun palet ne le recouvre.
 */
export function initialPuckPositions(player: Player, count: number): Vec[] {
  const lineY = elasticLine(player).y;
  const toward = player === 'A' ? 1 : -1; // de la cloison vers l'élastique
  const row = (n: number, y: number, shift = 0): Vec[] => {
    const step = DESIGN_WIDTH / (n + 1);
    return Array.from({ length: n }, (_, i) => ({ x: step * (i + 1) + shift, y }));
  };
  if (count <= 5) return row(count, (MID_Y + lineY) / 2);
  const front =
    MID_Y + toward * (DIVIDER_THICKNESS / 2 + 24 + CALC_BLOCK_SIZE.h + PUCK_RADIUS + PUCK_SPACING);
  const back = front + toward * (2 * PUCK_RADIUS + PUCK_SPACING);
  const n1 = Math.ceil(count / 2);
  const n2 = count - n1;
  const shift = n1 === n2 ? DESIGN_WIDTH / (n2 + 1) / 2 - PUCK_RADIUS / 2 : 0;
  return [...row(n1, front), ...row(n2, back, shift)];
}

/** Le palet lancé est-il revenu entre les deux élastiques, de toute sa taille ? */
const backInFront = (puck: Puck): boolean => {
  const p = puck.position();
  return PLAYERS.every((pl) => {
    const line = elasticLine(pl);
    return pl === 'A' ? p.y < line.y - PUCK_RADIUS : p.y > line.y + PUCK_RADIUS;
  });
};

export function createGameScene(deps: {
  physics: PhysicsWorld;
  pucksPerPlayer: number;
  pairs: readonly Pair[];
  rng?: Rng;
  onWin(player: Player): void;
}): GameScene {
  const { physics } = deps;
  const positionsAll = (): Vec[] =>
    PLAYERS.flatMap((p) => initialPuckPositions(p, deps.pucksPerPlayer));
  const view = new Container();
  const board = createBoard(physics);
  view.addChild(board.view);
  const elastics: Record<Player, Elastic> = { A: createElastic('A'), B: createElastic('B') };
  for (const p of PLAYERS) view.addChild(elastics[p].view);

  // Blocs de calcul sous les palets : une étiquette n'est jamais recouverte.
  const blocks: Record<Player, CalcBlock> = { A: createCalcBlock('A'), B: createCalcBlock('B') };
  for (const p of PLAYERS) view.addChild(blocks[p].view);

  const pucks: Puck[] = positionsAll().map((pos) => {
    const puck = createPuck(physics, pos);
    view.addChild(puck.view);
    return puck;
  });
  const rng = deps.rng ?? Math.random;
  const calcs = {} as Record<Player, Pair>;
  const crossings = createCrossingDetector();
  let clock = 0;
  const campsNow = () => pucks.map((p) => campOf(p.position().y));
  const isCorrect = (puck: Puck): boolean =>
    puck.label() === computeAnswer(calcs[campOf(puck.position().y)]);
  const drag = createDragController({
    physics,
    pucks: () => pucks,
    canLaunch: (p) => isCorrect(p),
  });
  const detector = createWinDetector();
  let won = false;

  // Nouveaux calculs pour les deux camps, puis ré-étiquetage de tous les palets.
  const relabel = (): void => {
    for (const pl of PLAYERS) {
      calcs[pl] = pickCalc(deps.pairs, (calcs[pl] as Pair | undefined) ?? null, rng);
      blocks[pl].setPair(calcs[pl]);
      const inCamp = pucks.filter((p) => campOf(p.position().y) === pl);
      const labels = labelCamp(calcs[pl], inCamp.length, rng);
      inCamp.forEach((p, i) => p.setLabel(labels ? labels.values[i]! : null));
    }
    crossings.reset(campsNow(), clock);
  };
  relabel();

  const placeInitial = (): void => {
    const positions = positionsAll();
    pucks.forEach((puck, i) => {
      puck.setVelocity({ x: 0, y: 0 });
      puck.body.setAngularVelocity(0);
      puck.setPosition(positions[i]!);
      puck.setIgnoreElastic(false);
      puck.syncView();
    });
  };

  return {
    view,
    drag,
    pucks: () => pucks,
    calc: (pl) => calcs[pl],
    isCorrect,
    tick: (deltaMs) => {
      clock += deltaMs;
      physics.step(deltaMs);
      const counts: Record<Player, number> = { A: 0, B: 0 };
      for (const puck of pucks) {
        puck.syncView(deltaMs);
        counts[campOf(puck.position().y)] += 1;
        const heldNow = PLAYERS.some((pl) => drag.held(pl) === puck);
        if (!heldNow && puck.ignoresElastic() && backInFront(puck)) puck.setIgnoreElastic(false);
      }
      for (const pl of PLAYERS) {
        const held = drag.held(pl);
        const pos = held ? held.position() : null;
        elastics[pl].draw(pos && stretchOf(pos, elasticLine(pl), pl) > 0 ? pos : null);
      }
      if (crossings.update(campsNow(), clock)) relabel();
      const winner = detector.update(counts, deltaMs);
      if (winner && !won) {
        won = true;
        drag.reset();
        deps.onWin(winner);
      }
    },
    reset: () => {
      drag.reset();
      placeInitial();
      relabel();
      detector.reset();
      won = false;
    },
    destroy: () => {
      drag.destroy();
      for (const puck of pucks) puck.destroy();
      board.destroy();
      view.destroy({ children: true });
    },
  };
}
