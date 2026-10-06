import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  ELASTIC_INSET,
  MAX_STRETCH,
  PUCK_RADIUS,
} from '../config/dimensions';
import { LAUNCH_POWER, MIN_STRETCH } from '../config/physics';
import type { ElasticLine, Player, Vec } from './types';

export function elasticLine(player: Player): ElasticLine {
  const y = player === 'A' ? DESIGN_HEIGHT - ELASTIC_INSET : ELASTIC_INSET;
  return { y, left: { x: 0, y }, right: { x: DESIGN_WIDTH, y } };
}

/** Point du palet en contact avec l'élastique : son bord côté joueur. */
export function contactPoint(puck: Vec, player: Player): Vec {
  return { x: puck.x, y: player === 'A' ? puck.y + PUCK_RADIUS : puck.y - PUCK_RADIUS };
}

/** Distance dont le bord du palet a repoussé l'élastique vers le bord du joueur (0 s'il est devant). */
export function stretchOf(puck: Vec, line: ElasticLine, player: Player): number {
  const c = contactPoint(puck, player);
  const d = player === 'A' ? c.y - line.y : line.y - c.y;
  return Math.max(0, d);
}

const unit = (v: Vec): Vec => {
  const n = Math.hypot(v.x, v.y);
  return n === 0 ? { x: 0, y: 0 } : { x: v.x / n, y: v.y / n };
};

/**
 * Vitesse (px/s) donnée au palet au relâcher. Direction : bissectrice du V formé par
 * l'élastique autour du point de contact ; norme proportionnelle à l'étirement (plafonné).
 */
export function launchVelocity(puck: Vec, line: ElasticLine, player: Player): Vec | null {
  const stretch = Math.min(stretchOf(puck, line, player), MAX_STRETCH);
  if (stretch < MIN_STRETCH) return null;
  const c = contactPoint(puck, player);
  const a = unit({ x: line.left.x - c.x, y: line.left.y - c.y });
  const b = unit({ x: line.right.x - c.x, y: line.right.y - c.y });
  const dir = unit({ x: a.x + b.x, y: a.y + b.y });
  const speed = stretch * LAUNCH_POWER;
  return { x: dir.x * speed, y: dir.y * speed };
}
