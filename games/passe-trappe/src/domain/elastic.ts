import { DESIGN_HEIGHT, DESIGN_WIDTH, ELASTIC_INSET, MAX_STRETCH } from '../config/dimensions';
import { LAUNCH_POWER, MIN_STRETCH } from '../config/physics';
import type { ElasticLine, Player, Vec } from './types';

export function elasticLine(player: Player): ElasticLine {
  const y = player === 'A' ? DESIGN_HEIGHT - ELASTIC_INSET : ELASTIC_INSET;
  return { y, left: { x: 0, y }, right: { x: DESIGN_WIDTH, y } };
}

/** Distance dont le palet a repoussé l'élastique vers le bord de son joueur (0 s'il est devant). */
export function stretchOf(puck: Vec, line: ElasticLine, player: Player): number {
  const d = player === 'A' ? puck.y - line.y : line.y - puck.y;
  return Math.max(0, d);
}

const unit = (v: Vec): Vec => {
  const n = Math.hypot(v.x, v.y);
  return n === 0 ? { x: 0, y: 0 } : { x: v.x / n, y: v.y / n };
};

/**
 * Vitesse (px/s) donnée au palet au relâcher. Direction : bissectrice du V
 * formé par l'élastique (somme des vecteurs unitaires palet → ancrages) ;
 * norme proportionnelle à l'étirement, plafonné à MAX_STRETCH.
 */
export function launchVelocity(puck: Vec, line: ElasticLine, player: Player): Vec | null {
  const stretch = Math.min(stretchOf(puck, line, player), MAX_STRETCH);
  if (stretch < MIN_STRETCH) return null;
  const a = unit({ x: line.left.x - puck.x, y: line.left.y - puck.y });
  const b = unit({ x: line.right.x - puck.x, y: line.right.y - puck.y });
  const dir = unit({ x: a.x + b.x, y: a.y + b.y });
  const speed = stretch * LAUNCH_POWER;
  return { x: dir.x * speed, y: dir.y * speed };
}
