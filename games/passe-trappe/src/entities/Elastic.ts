import { Container, Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';
import { ELASTIC_TWANG } from '../config/physics';
import { contactPoint, elasticLine, stretchOf } from '../domain/elastic';
import type { Player, Vec } from '../domain/types';

export interface Elastic {
  readonly view: Container;
  /**
   * Redessine l'élastique : en V autour du palet qui l'étire, sinon droit ou en train de vibrer.
   * Fait avancer la vibration de `dtMs`.
   */
  update(puck: Vec | null, dtMs?: number): void;
  /** Relâché après un étirement de `stretch` px : la corde vibre jusqu'au calme. */
  twang(stretch: number): void;
  isVibrating(): boolean;
  /** Écart actuel du milieu de la corde par rapport au repos (px, positif vers le bas). */
  offset(): number;
}

export function createElastic(player: Player): Elastic {
  const line = elasticLine(player);
  // La corde tendue part vers le bord de son joueur : vers le bas pour A, vers le haut pour B.
  const towardEdge = player === 'A' ? 1 : -1;
  const view = new Container();
  const g = new Graphics();
  view.addChild(g);
  let amplitude = 0;
  let elapsed = 0;

  const currentOffset = (): number => {
    if (amplitude === 0) return 0;
    const envelope = amplitude * Math.exp(-elapsed / ELASTIC_TWANG.decayMs);
    return towardEdge * envelope * Math.cos(2 * Math.PI * ELASTIC_TWANG.freqHz * (elapsed / 1000));
  };

  const stroke = { width: 5, color: COLORS.elastic, cap: 'round' } as const;

  const update = (puck: Vec | null, dtMs = 0): void => {
    g.clear();
    if (puck && stretchOf(puck, line, player) > 0) {
      amplitude = 0;
      const c = contactPoint(puck, player);
      g.moveTo(line.left.x, line.y).lineTo(c.x, c.y).lineTo(line.right.x, line.y).stroke(stroke);
      return;
    }
    if (amplitude > 0) {
      elapsed += dtMs;
      if (amplitude * Math.exp(-elapsed / ELASTIC_TWANG.decayMs) < ELASTIC_TWANG.restPx)
        amplitude = 0;
    }
    const off = currentOffset();
    const midX = (line.left.x + line.right.x) / 2;
    // Courbe quadratique : le point de contrôle à 2 × l'écart place le milieu de la corde à `off`.
    g.moveTo(line.left.x, line.y)
      .quadraticCurveTo(midX, line.y + 2 * off, line.right.x, line.y)
      .stroke(stroke);
  };

  update(null);
  return {
    view,
    update,
    twang: (stretch) => {
      amplitude = Math.max(0, stretch);
      elapsed = 0;
    },
    isVibrating: () => amplitude > 0,
    offset: currentOffset,
  };
}
