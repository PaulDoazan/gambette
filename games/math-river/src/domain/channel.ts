import { CHANNEL_WIDTH, DESIGN_WIDTH, HOLE_RADIUS, MID_Y } from '../config/dimensions';
import type { Vec } from './types';

/** Amplitude (px) du S que dessine le canal entre le trou et le bord droit. */
const SWAY = 34;
/** Évasement du canal à son raccord avec le trou (×, en plus de la largeur courante). */
const FLARE = 1.1;
/**
 * Congé au raccord : sur le premier tiers, le canal s'évase encore de FILLET px pour que ses berges
 * partent du bord du trou dans le sens de son contour (raccord arrondi, sans angle).
 */
const FILLET = 25;
const FILLET_SPAN = 0.35;

/** Le canal part de l'intérieur du bord du trou : son évasement se fond dans la cuvette. */
const startX = (): number => DESIGN_WIDTH / 2 + HOLE_RADIUS - 24;

/**
 * Ligne centrale du canal à `t` ∈ [0, 1] : du trou (t = 0) au bord droit (t = 1), à mi-hauteur aux
 * deux bouts, en S entre les deux. Lue à l'appel (la hauteur du plateau dépend de l'écran).
 */
export function channelCenter(t: number): Vec {
  const u = Math.min(1, Math.max(0, t));
  const x0 = startX();
  // Amplitude qui croît depuis le trou : le canal en sort à l'horizontale, sans cassure.
  return { x: x0 + (DESIGN_WIDTH - x0) * u, y: MID_Y + SWAY * u * Math.sin(2 * Math.PI * u) };
}

/** Demi-largeur du canal à `t` : évasé au raccord avec le trou, régulier ensuite. */
export function channelHalfWidth(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  const fillet = FILLET * Math.max(0, 1 - u / FILLET_SPAN) ** 2;
  return (CHANNEL_WIDTH / 2) * (1 + FLARE * Math.pow(1 - u, 1.6)) + fillet;
}

/** Direction (radians) du canal à `t`. */
export function channelHeading(t: number): number {
  const a = channelCenter(t - 0.01);
  const b = channelCenter(t + 0.01);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Contour du canal entre t = 0 et `upTo`, élargi de `extra` px de chaque côté (négatif : rétréci),
 * en liste plate x, y pour Graphics.poly : un bord à l'aller, l'autre au retour.
 */
export function channelOutline(extra: number, upTo = 1, steps = 40): number[] {
  const left: number[] = [];
  const right: number[] = [];
  const n = Math.max(2, Math.round(steps * upTo));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * upTo;
    const c = channelCenter(t);
    const h = channelHeading(t);
    const w = channelHalfWidth(t) + extra;
    const nx = -Math.sin(h);
    const ny = Math.cos(h);
    left.push(c.x + nx * w, c.y + ny * w);
    right.unshift(c.x - nx * w, c.y - ny * w);
  }
  return [...left, ...right];
}

/** Un des deux bords du canal (+1 / −1), en liste plate x, y pour un tracé. */
export function channelBank(side: 1 | -1, steps = 40): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = channelCenter(t);
    const h = channelHeading(t);
    const w = channelHalfWidth(t) * side;
    pts.push(c.x - Math.sin(h) * w, c.y + Math.cos(h) * w);
  }
  return pts;
}
