import { DESIGN_WIDTH, MID_Y } from './dimensions';
import type { Vec } from '../domain/types';

/** Une manche : un trou plus grand que le précédent, qui demande plus de bons seaux. */
export interface RoundSpec {
  holeRadius: number;
  /** Apport d'un bon seau tombé dans le trou. */
  perBucket: number;
  /** Infiltration continue au fond du trou (niveau perdu par seconde). */
  drainPerSecond: number;
}

/**
 * Infiltration du jeu à un trou, la même à chaque manche : sans bons seaux réguliers, l'eau
 * redescend, il faut se dépêcher (elle ne descend jamais sous `MIN_LEVEL`, pas de défaite).
 */
const DRAIN_PER_SECOND = 0.018;

/**
 * Calibrage : à un bon seau toutes les 3 s pour la paire, l'eau monte de 0,2 à 1 en ≈ 36 s dans
 * le premier trou (réglage du jeu à un trou), ≈ 47 s puis ≈ 58 s dans les suivants, plus grands.
 */
const round = (holeRadius: number, perBucket: number): RoundSpec => ({
  holeRadius,
  perBucket,
  drainPerSecond: DRAIN_PER_SECOND,
});

/** Trois trous de plus en plus grands ; le dernier débouche sur la mer. */
export const ROUNDS: readonly RoundSpec[] = [
  round(160, 0.12),
  round(190, 0.105),
  round(220, 0.095),
];
export const LAST_ROUND = ROUNDS.length - 1;

/** Effacement (et retour) de l'interface en fin de manche, puis trajet de la caméra. */
export const UI_FADE_MS = 300;
export const PAN_MS = 2500;

/** Centre du trou k, en coordonnées du monde : au milieu de l'écran k. */
export const holeCenterOf = (k: number): Vec => ({
  x: k * DESIGN_WIDTH + DESIGN_WIDTH / 2,
  y: MID_Y,
});

/** Rayon de la surface de l'eau au niveau du canal, dans le trou k. */
export const waterRadiusMax = (k: number): number => ROUNDS[k]!.holeRadius - 22;
