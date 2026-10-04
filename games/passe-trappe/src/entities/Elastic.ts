import { Container, Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';
import { elasticLine, stretchOf } from '../domain/elastic';
import type { Player, Vec } from '../domain/types';

export interface Elastic {
  readonly view: Container;
  /** Dessine l'élastique droit, ou en V autour du palet qui l'étire. */
  draw(puck: Vec | null): void;
}

export function createElastic(player: Player): Elastic {
  const line = elasticLine(player);
  const view = new Container();
  const g = new Graphics();
  view.addChild(g);
  const draw = (puck: Vec | null): void => {
    g.clear();
    g.moveTo(line.left.x, line.y);
    if (puck && stretchOf(puck, line, player) > 0) g.lineTo(puck.x, puck.y);
    g.lineTo(line.right.x, line.y).stroke({ width: 5, color: COLORS.elastic, cap: 'round' });
  };
  draw(null);
  return { view, draw };
}
