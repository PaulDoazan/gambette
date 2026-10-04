import { Container } from 'pixi.js';
import { computeAnswer, type Pair, type Rng } from '@gambette/math-sdk';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import { createBoard } from '../entities/Board';
import { createElastic, type Elastic } from '../entities/Elastic';
import { createCalcBlock, type CalcBlock } from '../entities/CalcBlock';
import { createPuck, type Puck } from '../entities/Puck';
import { createDragController, type DragController } from '../input/DragController';
import {
  CALC_BLOCK,
  CALC_BLOCK_SIZE,
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MID_Y,
  PUCK_RADIUS,
  PUCK_SPACING,
} from '../config/dimensions';
import { elasticLine, stretchOf } from '../domain/elastic';
import { campOf, createWinDetector } from '../domain/rules';
import { ELASTIC_NUDGE_SPEED } from '../config/physics';
import { createCrossingDetector, type Crossing } from '../domain/crossings';
import { extraDistractor, labelCamp, pickCalc } from '../domain/quiz';
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

/** Désordre initial : décalage aléatoire maximal (px) autour de la grille, et marge de sécurité. */
const SCATTER = { x: 22, y: 40, tries: 25, margin: 4 } as const;

/** Position valide pour un palet de `player` au départ : dans son camp, devant l'élastique, hors du bloc. */
const validStart = (p: Vec, player: Player): boolean => {
  const R = PUCK_RADIUS + SCATTER.margin;
  if (p.x - R < 0 || p.x + R > DESIGN_WIDTH) return false;
  const line = elasticLine(player).y;
  const divider = DIVIDER_THICKNESS / 2;
  const inCamp =
    player === 'A'
      ? p.y - R > MID_Y + divider && p.y + R < line
      : p.y + R < MID_Y - divider && p.y - R > line;
  if (!inCamp) return false;
  const c = CALC_BLOCK[player];
  const dx = Math.max(Math.abs(p.x - c.x) - CALC_BLOCK_SIZE.w / 2, 0);
  const dy = Math.max(Math.abs(p.y - c.y) - CALC_BLOCK_SIZE.h / 2, 0);
  return Math.hypot(dx, dy) > R;
};

/**
 * Disposition de départ « un peu désordonnée » : chaque palet de la grille est décalé au hasard
 * (± SCATTER.x, ± SCATTER.y), en restant valide et sans chevaucher les autres ; après
 * SCATTER.tries essais infructueux, il garde sa place de grille.
 */
export function scatteredPuckPositions(player: Player, count: number, rng: Rng): Vec[] {
  const pos = initialPuckPositions(player, count);
  const minGap = 2 * PUCK_RADIUS + SCATTER.margin;
  pos.forEach((base, i) => {
    for (let t = 0; t < SCATTER.tries; t++) {
      const cand = {
        x: base.x + (rng() * 2 - 1) * SCATTER.x,
        y: base.y + (rng() * 2 - 1) * SCATTER.y,
      };
      const free = pos.every((q, j) => j === i || Math.hypot(q.x - cand.x, q.y - cand.y) > minGap);
      if (free && validStart(cand, player)) {
        pos[i] = cand;
        break;
      }
    }
  });
  return pos;
}

/** Le palet lancé est-il revenu entre les deux élastiques, de toute sa taille ? */
const backInFront = (puck: Puck): boolean => {
  const p = puck.position();
  return PLAYERS.every((pl) => {
    const line = elasticLine(pl);
    return pl === 'A' ? p.y < line.y - PUCK_RADIUS : p.y > line.y + PUCK_RADIUS;
  });
};

/** Palet qui ignore l'élastique mais immobile derrière la ligne : on le pousse vers la cloison. */
const nudgeIfStuck = (puck: Puck): void => {
  const v = puck.velocity();
  if (Math.hypot(v.x, v.y) >= 10) return;
  const player = campOf(puck.position().y);
  puck.setVelocity({ x: v.x, y: (player === 'A' ? -1 : 1) * ELASTIC_NUDGE_SPEED });
};

export function createGameScene(deps: {
  physics: PhysicsWorld;
  pucksPerPlayer: number;
  pairs: readonly Pair[];
  rng?: Rng;
  onWin(player: Player): void;
}): GameScene {
  const { physics } = deps;
  const rng = deps.rng ?? Math.random;
  const positionsAll = (): Vec[] =>
    PLAYERS.flatMap((p) => scatteredPuckPositions(p, deps.pucksPerPlayer, rng));
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

  const inCampOf = (pl: Player): Puck[] => pucks.filter((p) => campOf(p.position().y) === pl);

  // Nouveau calcul pour un camp et ré-étiquetage de tous ses palets.
  const renewCamp = (pl: Player): void => {
    calcs[pl] = pickCalc(deps.pairs, (calcs[pl] as Pair | undefined) ?? null, rng);
    blocks[pl].setPair(calcs[pl]);
    const inCamp = inCampOf(pl);
    const labels = labelCamp(calcs[pl], inCamp.length, rng);
    inCamp.forEach((p, i) => p.setLabel(labels ? labels.values[i]! : null));
  };

  // Palets arrivés dans un camp dont le calcul ne change pas : nouvelle mauvaise réponse distincte,
  // sauf si le camp n'a plus de bonne réponse (il était vide) : le premier arrivé la reçoit.
  const labelArrivals = (pl: Player, arrivals: readonly Puck[]): void => {
    const answer = computeAnswer(calcs[pl]);
    const others = inCampOf(pl).filter((p) => !arrivals.includes(p));
    let hasCorrect = others.some((p) => p.label() === answer);
    const existing = others.map((p) => p.label()).filter((v): v is number => v !== null);
    for (const puck of arrivals) {
      const value = hasCorrect ? extraDistractor(calcs[pl], existing, rng) : answer;
      hasCorrect = true;
      existing.push(value);
      puck.setLabel(value);
    }
  };

  // Départ, Rejouer : nouveaux calculs pour les deux camps.
  const relabelAll = (): void => {
    for (const pl of PLAYERS) renewCamp(pl);
    crossings.reset(campsNow(), clock);
  };

  // Passage(s) de la ligne médiane : seul le camp d'où part un palet change de calcul ; le camp
  // d'arrivée garde son calcul et ses étiquettes, les arrivants reçoivent une étiquette nouvelle.
  const onCrossings = (list: readonly Crossing[]): void => {
    const departed = new Set(list.map((c) => c.from));
    for (const pl of departed) renewCamp(pl);
    for (const pl of PLAYERS) {
      if (departed.has(pl)) continue;
      const arrivals = list.filter((c) => c.to === pl).map((c) => pucks[c.index]!);
      if (arrivals.length > 0) labelArrivals(pl, arrivals);
    }
  };
  relabelAll();

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
        if (!heldNow && puck.ignoresElastic()) {
          if (backInFront(puck)) puck.setIgnoreElastic(false);
          else nudgeIfStuck(puck);
        }
      }
      for (const pl of PLAYERS) {
        const held = drag.held(pl);
        const pos = held ? held.position() : null;
        elastics[pl].draw(pos && stretchOf(pos, elasticLine(pl), pl) > 0 ? pos : null);
      }
      const crossed = crossings.update(campsNow(), clock);
      if (crossed.length > 0) onCrossings(crossed);
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
      relabelAll();
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
