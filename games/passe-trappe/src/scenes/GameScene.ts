import { Container } from 'pixi.js';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import { createBoard } from '../entities/Board';
import { createElastic, type Elastic } from '../entities/Elastic';
import { createPuck, type Puck } from '../entities/Puck';
import { createDragController, type DragController } from '../input/DragController';
import {
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MID_Y,
  PUCK_RADIUS,
  PUCK_SPACING,
} from '../config/dimensions';
import { elasticLine, stretchOf } from '../domain/elastic';
import { campOf, createWinDetector } from '../domain/rules';
import { PLAYERS, type Player, type Vec } from '../domain/types';

export interface GameScene {
  readonly view: Container;
  readonly drag: DragController;
  pucks(): readonly Puck[];
  tick(deltaMs: number): void;
  reset(): void;
  destroy(): void;
}

/**
 * Disposition de départ. Jusqu'à 5 palets : une rangée à mi-chemin entre la cloison et
 * l'élastique. Au-delà : deux rangées (ceil(n/2) côté cloison, floor(n/2) côté élastique),
 * la seconde décalée d'un demi-pas si les deux rangées ont le même nombre de palets.
 */
export function initialPuckPositions(player: Player, count: number): Vec[] {
  const lineY = elasticLine(player).y;
  const toward = player === 'A' ? 1 : -1; // de la cloison vers l'élastique
  const row = (n: number, y: number, shift = 0): Vec[] => {
    const step = DESIGN_WIDTH / (n + 1);
    return Array.from({ length: n }, (_, i) => ({ x: step * (i + 1) + shift, y }));
  };
  if (count <= 5) return row(count, (MID_Y + lineY) / 2);
  const front = MID_Y + toward * (DIVIDER_THICKNESS / 2 + PUCK_RADIUS + 2 * PUCK_SPACING);
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

  const pucks: Puck[] = positionsAll().map((pos) => {
    const puck = createPuck(physics, pos);
    view.addChild(puck.view);
    return puck;
  });
  const drag = createDragController({ physics, pucks: () => pucks });
  const detector = createWinDetector();
  let won = false;

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
    tick: (deltaMs) => {
      physics.step(deltaMs);
      const counts: Record<Player, number> = { A: 0, B: 0 };
      for (const puck of pucks) {
        puck.syncView();
        counts[campOf(puck.position().y)] += 1;
        const heldNow = PLAYERS.some((pl) => drag.held(pl) === puck);
        if (!heldNow && puck.ignoresElastic() && backInFront(puck)) puck.setIgnoreElastic(false);
      }
      for (const pl of PLAYERS) {
        const held = drag.held(pl);
        const pos = held ? held.position() : null;
        elastics[pl].draw(pos && stretchOf(pos, elasticLine(pl), pl) > 0 ? pos : null);
      }
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
      detector.reset();
      won = false;
    },
    destroy: () => {
      drag.destroy();
      view.destroy({ children: true });
    },
  };
}
