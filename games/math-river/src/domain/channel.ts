import { CHANNEL_WIDTH, DESIGN_WIDTH, MID_Y } from '../config/dimensions';
import { LAST_ROUND, ROUNDS, holeCenterOf } from '../config/rounds';
import type { Vec } from './types';

/** Amplitude (px) des méandres d'un canal, sur un tronçon assez long. */
const SWAY = 40;
/** Longueur de tronçon (px) en dessous de laquelle les méandres s'aplatissent. */
const SWAY_SPAN = 200;
/** Évasement du canal à un raccord avec un trou (×, en plus de la largeur courante). */
const FLARE = 1.1;
/** Distance (px) sur laquelle l'évasement se résorbe. */
const FLARE_SPAN = 160;
/**
 * Congé au raccord : près du trou, le canal s'évase encore de FILLET px pour que ses berges partent
 * du bord du trou dans le sens de son contour (raccord arrondi, sans angle).
 */
const FILLET = 25;
const FILLET_SPAN = 0.35 * FLARE_SPAN;
/** Le canal part de l'intérieur du bord du trou : son évasement se fond dans la cuvette. */
const INSET = 24;

/** Rivage de la mer (x monde), sur le bord droit du dernier écran. */
export const SEA_SHORE_X = (): number => LAST_ROUND * DESIGN_WIDTH + 650;

/** Un canal en coordonnées du monde, paramétré par t ∈ [0, 1] de son départ à son arrivée. */
export interface Channel {
  center(t: number): Vec;
  halfWidth(t: number): number;
  /** Direction (radians) du canal à `t`. */
  heading(t: number): number;
  /**
   * Contour entre `from` et `to` (berges décalées verticalement : le canal file de gauche à droite,
   * ses bords ne se recoupent jamais, même où il s'évase dans un méandre), élargi de `extra` px de chaque côté (négatif : rétréci), en liste
   * plate x, y pour Graphics.poly : un bord à l'aller, l'autre au retour.
   */
  outline(extra: number, from?: number, to?: number): number[];
  /** Un des deux bords (+1 / −1), en liste plate x, y pour un tracé. */
  bank(side: 1 | -1): number[];
}

/** Élargissement au raccord avec un trou, à `d` px de ce raccord (nul au-delà de FLARE_SPAN). */
const flare = (d: number): number =>
  (CHANNEL_WIDTH / 2) * FLARE * Math.pow(1 - Math.min(1, d / FLARE_SPAN), 1.6) +
  FILLET * Math.max(0, 1 - d / FILLET_SPAN) ** 2;

/** Méandre d'un tronçon, v ∈ [0, 1] : nul et bien à plat à ses deux bouts (raccords sans cassure). */
const meander = (v: number, length: number): number =>
  SWAY *
  Math.min(1, length / SWAY_SPAN) ** 2 *
  Math.sin(2 * Math.PI * v) *
  Math.sin(Math.PI * v) ** 2;

/**
 * Canal qui part du trou k : vers le trou k+1, en franchissant la frontière des deux écrans à
 * mi-hauteur et à l'horizontale (chaque écran, vu seul, montre un canal qui sort du cadre), ou,
 * depuis le dernier trou, jusque dans la mer.
 */
export function channelFrom(k: number): Channel {
  const toSea = k >= LAST_ROUND;
  const x0 = holeCenterOf(k).x + ROUNDS[k]!.holeRadius - INSET;
  const x1 = toSea ? SEA_SHORE_X() + 30 : holeCenterOf(k + 1).x - ROUNDS[k + 1]!.holeRadius + INSET;
  // Tronçons : jusqu'à la frontière d'écran, puis au-delà (un seul vers la mer).
  const xb = toSea ? x1 : (k + 1) * DESIGN_WIDTH;
  const len = x1 - x0;
  const center = (t: number): Vec => {
    const x = x0 + len * Math.min(1, Math.max(0, t));
    const y =
      x <= xb
        ? MID_Y + meander((x - x0) / (xb - x0), xb - x0)
        : MID_Y + meander((x - xb) / (x1 - xb), x1 - xb);
    return { x, y };
  };
  const halfWidth = (t: number): number => {
    const x = x0 + len * Math.min(1, Math.max(0, t));
    // Vers la mer, le canal s'ouvre en estuaire plutôt qu'en raccord de trou.
    return CHANNEL_WIDTH / 2 + flare(x - x0) + flare(x1 - x);
  };
  const heading = (t: number): number => {
    const a = center(t - 0.002);
    const b = center(t + 0.002);
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  const steps = Math.max(24, Math.round(len / 10));
  return {
    center,
    halfWidth,
    heading,
    outline: (extra, from = 0, to = 1) => {
      const left: number[] = [];
      const right: number[] = [];
      const n = Math.max(2, Math.round(steps * (to - from)));
      for (let i = 0; i <= n; i++) {
        const t = from + ((to - from) * i) / n;
        const c = center(t);
        const w = halfWidth(t) + extra;
        left.push(c.x, c.y + w);
        right.unshift(c.x, c.y - w);
      }
      return [...left, ...right];
    },
    bank: (side) => {
      const pts: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const c = center(t);
        pts.push(c.x, c.y + halfWidth(t) * side);
      }
      return pts;
    },
  };
}

/** t où le canal du trou k franchit la frontière avec l'écran suivant. */
export function channelBoundaryT(k: number): number {
  const x0 = holeCenterOf(k).x + ROUNDS[k]!.holeRadius - INSET;
  const x1 = holeCenterOf(k + 1).x - ROUNDS[k + 1]!.holeRadius + INSET;
  return ((k + 1) * DESIGN_WIDTH - x0) / (x1 - x0);
}
