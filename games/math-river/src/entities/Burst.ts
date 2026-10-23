// Repris de passe-trappe (entities/Burst.ts) : même éclat au changement de calcul.
import type { Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';

/** Durée de l'éclat (ms) qui signale un chiffre ou un calcul qui vient de changer. */
export const BURST_MS = 600;
/** Gonflement maximal du chiffre au sommet de l'éclat. */
const POP = 0.5;
/** Part de l'éclat consacrée au gonflement (le reste : retour à la normale). */
const RISE = 0.25;

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

/** Étincelle de l'éclat : direction, portée relative, taille (px) et léger retard au départ. */
export interface Spark {
  angle: number;
  speed: number;
  size: number;
  delay: number;
}

/** `count` étincelles réparties tout autour (directions régulières, un peu désordonnées). */
export function makeSparks(count: number, rng: () => number = Math.random): Spark[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: ((i + rng() * 0.8) * 2 * Math.PI) / count,
    speed: 0.55 + rng() * 0.7,
    size: 8 + rng() * 6,
    delay: rng() * 0.15,
  }));
}

/** Étincelle à `t` ∈ [0, 1] : distance parcourue (fraction de la portée), taille, opacité. */
export function sparkAt(
  spark: Spark,
  t: number,
): { distance: number; size: number; alpha: number } {
  if (t >= 1) return { distance: spark.speed, size: 0, alpha: 0 };
  const u = Math.min(1, Math.max(0, (t - spark.delay) / (1 - spark.delay)));
  if (u === 0) return { distance: 0, size: 0, alpha: 0 };
  return { distance: spark.speed * easeOut(u), size: spark.size * (1 - u), alpha: 1 - u * u };
}

/** Point de départ d'une étincelle et sa direction (radians, vers l'extérieur). */
export interface SparkOrigin {
  x: number;
  y: number;
  dir: number;
}

/** Palet (cercle de rayon `r`) : l'étincelle part du bord, dans sa direction. */
export const circleSparkOrigin =
  (r: number) =>
  (s: Spark): SparkOrigin => ({ x: Math.cos(s.angle) * r, y: Math.sin(s.angle) * r, dir: s.angle });

/**
 * Cadre `w` × `h` centré : les étincelles sont réparties le long du pourtour (4 côtés), chacune
 * part vers l'extérieur du côté où elle naît, un peu de biais.
 */
export function rectSparkOrigin(s: Spark, w: number, h: number): SparkOrigin {
  const per = 2 * (w + h);
  let d = ((s.angle / (2 * Math.PI)) % 1) * per;
  const tilt = (s.speed - 0.9) * 0.8; // biais ±0,28 rad, tiré de la vitesse
  if (d < w) return { x: -w / 2 + d, y: -h / 2, dir: -Math.PI / 2 + tilt };
  d -= w;
  if (d < h) return { x: w / 2, y: -h / 2 + d, dir: tilt };
  d -= h;
  if (d < w) return { x: w / 2 - d, y: h / 2, dir: Math.PI / 2 + tilt };
  d -= w;
  return { x: -w / 2, y: h / 2 - d, dir: Math.PI + tilt };
}

/**
 * Étincelles jaunes (losanges) qui jaillissent vers l'extérieur : chacune part de `origin(s)` et
 * file sur `reach` px dans sa direction.
 */
export function drawSparks(
  g: Graphics,
  sparks: readonly Spark[],
  t: number,
  origin: (s: Spark) => SparkOrigin,
  reach: number,
): void {
  g.clear();
  for (const s of sparks) {
    const f = sparkAt(s, t);
    if (f.alpha <= 0 || f.size <= 0) continue;
    const o = origin(s);
    const x = o.x + Math.cos(o.dir) * reach * f.distance;
    const y = o.y + Math.sin(o.dir) * reach * f.distance;
    const r = f.size;
    g.poly([x, y - r * 1.6, x + r, y, x, y + r * 1.6, x - r, y]).fill({
      color: COLORS.button,
      alpha: f.alpha,
    });
  }
}
