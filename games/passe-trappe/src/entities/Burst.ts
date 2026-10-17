import { Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';

/** Durée de l'éclat (ms) qui signale un chiffre ou un calcul qui vient de changer. */
export const BURST_MS = 600;
/** Gonflement maximal du chiffre au sommet de l'éclat. */
const POP = 0.5;
/** Part de l'éclat consacrée au gonflement (le reste : retour à la normale). */
const RISE = 0.25;
const RAYS = 8;

export interface BurstFrame {
  /** Échelle du chiffre (1 = normale). */
  scale: number;
  /** Mélange vers la couleur d'éclat (0 = couleur d'origine, 1 = jaune). */
  glow: number;
  /** Rayons autour : distance (0 → 1, fraction de leur course) et opacité. */
  rays: { radius: number; alpha: number };
}

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/** État de l'éclat à `t` ∈ [0, 1] (au-delà : terminé, état normal). */
export function burstFrame(t: number): BurstFrame {
  if (t >= 1) return { scale: 1, glow: 0, rays: { radius: 1, alpha: 0 } };
  const pop = t < RISE ? easeOut(t / RISE) : 1 - easeOut((t - RISE) / (1 - RISE));
  return { scale: 1 + POP * pop, glow: pop, rays: { radius: easeOut(t), alpha: 1 - t } };
}

/** Mélange linéaire de deux couleurs 0xRRGGBB. */
export function mixColor(from: number, to: number, k: number): number {
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const m = (s: number) => Math.round(ch(from, s) + (ch(to, s) - ch(from, s)) * k);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/** Rayons jaunes qui jaillissent de `inner` à `outer` (px) autour du centre. */
export function drawRays(g: Graphics, inner: number, outer: number, frame: BurstFrame): void {
  g.clear();
  const from = inner + (outer - inner) * frame.rays.radius * 0.5;
  const to = inner + (outer - inner) * frame.rays.radius;
  for (let i = 0; i < RAYS; i++) {
    const a = (i * 2 * Math.PI) / RAYS;
    g.moveTo(Math.cos(a) * from, Math.sin(a) * from).lineTo(Math.cos(a) * to, Math.sin(a) * to);
  }
  g.stroke({ width: 5, color: COLORS.button, cap: 'round', alpha: frame.rays.alpha });
}
