import { Container, Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';
import { headingAt, pointAt, routeLength, slice } from '../domain/route';
import type { Vec } from '../domain/types';

/** Vitesse des traînées d'écume qui filent dans le courant (px/ms). */
const FOAM_SPEED = 0.22;
/** Écart entre deux traînées d'écume (px). */
const FOAM_GAP = 58;

export interface WaterRun {
  readonly view: Container;
  readonly length: number;
  /** Avancée de l'eau depuis le début du chemin (px), bornée à sa longueur. */
  setFront(s: number): void;
  front(): number;
  /** Tête bouillonnante : l'eau avance (vrai) ou reste en place (faux). */
  setRushing(on: boolean): void;
  update(dtMs: number): void;
}

const stroke = (g: Graphics, pts: readonly Vec[]): Graphics => {
  g.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
  return g;
};

/**
 * Eau qui s'engouffre le long d'un chemin (galerie ou canal) : un courant aux bords plus sombres,
 * un reflet clair, de l'écume qui file vers l'aval, et une tête bombée qui bouillonne et projette
 * des gouttes tant que l'eau avance.
 */
export function createWaterRun(route: readonly Vec[], width: number): WaterRun {
  const view = new Container();
  view.label = 'water-run';
  const g = new Graphics();
  view.addChild(g);
  const length = routeLength(route);
  let front = 0;
  let rushing = false;
  let clock = 0;

  const draw = (): void => {
    g.clear();
    if (front <= 0.5) return;
    const pts = slice(route, 0, front);
    if (pts.length < 2) return;
    const join = { cap: 'round', join: 'round' } as const;
    stroke(g, pts).stroke({ width: width + 12, color: COLORS.wetSand, alpha: 0.4, ...join });
    stroke(g, pts).stroke({ width: width + 4, color: COLORS.waterEdge, ...join });
    stroke(g, pts).stroke({ width, color: COLORS.water, ...join });
    stroke(g, pts).stroke({ width: width * 0.4, color: COLORS.waterLight, alpha: 0.35, ...join });
    // Écume : de courtes traînées qui descendent le courant.
    const shift = (clock * FOAM_SPEED) % FOAM_GAP;
    for (let s = shift; s < front - 10; s += FOAM_GAP) {
      const seg = slice(route, s, Math.min(front - 4, s + 16));
      if (seg.length < 2) continue;
      const side = Math.sin(s / 37) * width * 0.22;
      const h = headingAt(route, s) + Math.PI / 2;
      const off = seg.map((p) => ({ x: p.x + Math.cos(h) * side, y: p.y + Math.sin(h) * side }));
      stroke(g, off).stroke({ width: 3, color: COLORS.foam, alpha: 0.65, cap: 'round' });
    }
    if (!rushing) return;
    // Tête bombée qui bouillonne, écume en croissant et gouttes projetées devant.
    const tip = pointAt(route, front);
    const h = headingAt(route, front);
    const bulge = width / 2 + 4 + Math.sin(clock / 60) * 2;
    g.circle(tip.x, tip.y, bulge + 2).fill(COLORS.waterEdge);
    g.circle(tip.x, tip.y, bulge).fill(COLORS.water);
    const foamR = bulge - 4;
    g.moveTo(tip.x + Math.cos(h - 1.1) * foamR, tip.y + Math.sin(h - 1.1) * foamR)
      .arc(tip.x, tip.y, foamR, h - 1.1, h + 1.1)
      .stroke({
        width: 4,
        color: COLORS.foam,
        alpha: 0.85,
        cap: 'round',
      });
    for (let i = 0; i < 4; i++) {
      const phase = (clock / 220 + i * 0.27) % 1;
      const ahead = bulge + 4 + phase * 22;
      const spread = Math.sin(i * 2.1 + clock / 140) * width * 0.5;
      const x = tip.x + Math.cos(h) * ahead - Math.sin(h) * spread;
      const y = tip.y + Math.sin(h) * ahead + Math.cos(h) * spread;
      g.circle(x, y, 3.5 * (1 - phase) + 1).fill({ color: COLORS.waterLight, alpha: 1 - phase });
    }
  };

  return {
    view,
    length,
    setFront: (s) => {
      front = Math.max(0, Math.min(length, s));
      draw();
    },
    front: () => front,
    setRushing: (on) => {
      rushing = on;
      draw();
    },
    update: (dtMs) => {
      clock += dtMs;
      draw();
    },
  };
}
