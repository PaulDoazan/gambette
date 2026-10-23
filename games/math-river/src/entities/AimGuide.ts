import { Graphics } from 'pixi.js';
import { BUCKET_RADIUS } from '../config/dimensions';
import { COLORS } from '../config/theme';
import { flightAt, type Aim } from '../domain/aim';
import type { Vec } from '../domain/types';

/** Nombre de points de l'aperçu de trajectoire. */
const DOTS = 14;
/** Écart des deux piquets de l'élastique de part et d'autre de la place du seau. */
const PEG_SPREAD = BUCKET_RADIUS + 14;

/**
 * Visée d'un joueur : place du seau en pointillés, élastique tendu de deux piquets au seau, points
 * de la cloche (taille = hauteur de l'eau) et viseur au point d'impact.
 */
export function createAimGuide(): {
  readonly view: Graphics;
  show(home: Vec, grip: Vec, aim: Aim | null): void;
  hide(): void;
} {
  const view = new Graphics();
  view.label = 'aim';
  return {
    view,
    show: (home, grip, aim) => {
      view.clear();
      // Piquets perpendiculaires à la traction (les deux joueurs, sans cas particulier).
      const dx = grip.x - home.x;
      const dy = grip.y - home.y;
      const d = Math.hypot(dx, dy) || 1;
      const px = (-dy / d) * PEG_SPREAD;
      const py = (dx / d) * PEG_SPREAD;
      const left = { x: home.x + px, y: home.y + py };
      const right = { x: home.x - px, y: home.y - py };
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2;
        view
          .moveTo(home.x + Math.cos(a0) * BUCKET_RADIUS, home.y + Math.sin(a0) * BUCKET_RADIUS)
          .arc(home.x, home.y, BUCKET_RADIUS, a0, a0 + Math.PI / 16);
      }
      view.stroke({ width: 3, color: COLORS.guide, alpha: 0.8 });
      view
        .moveTo(left.x, left.y)
        .lineTo(grip.x, grip.y)
        .lineTo(right.x, right.y)
        .stroke({ width: 5, color: 0x222222, join: 'round' });
      view.circle(left.x, left.y, 7).fill(COLORS.pitLine);
      view.circle(right.x, right.y, 7).fill(COLORS.pitLine);
      if (!aim) return;
      for (let k = 1; k <= DOTS; k++) {
        const f = flightAt(home, aim.target, k / (DOTS + 1));
        view.circle(f.x, f.y, 3).fill({ color: 0x000000, alpha: 0.15 });
        view
          .circle(f.x, f.y - f.lift * 40, 5 + f.lift * 7)
          .fill(COLORS.guide)
          .stroke({ width: 2, color: COLORS.waterEdge });
      }
      const t = aim.target;
      view.ellipse(t.x, t.y, 44, 32).stroke({ width: 4, color: COLORS.guide });
      view
        .moveTo(t.x - 12, t.y)
        .lineTo(t.x + 12, t.y)
        .moveTo(t.x, t.y - 12)
        .lineTo(t.x, t.y + 12)
        .stroke({ width: 4, color: COLORS.guide, cap: 'round' });
    },
    hide: () => {
      view.clear();
    },
  };
}
