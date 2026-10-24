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
 * Calibrage : à un bon seau toutes les 3 s pour la paire, une manche de `seconds` secondes fait
 * monter l'eau de 0,2 à 1. L'infiltration vaut 1/12 d'un seau par seconde : une paire lente, à un
 * bon seau toutes les 8 s, progresse toujours (pas de défaite).
 */
const round = (holeRadius: number, seconds: number): RoundSpec => {
  const perBucket = 3.2 / seconds;
  return { holeRadius, perBucket, drainPerSecond: perBucket / 12 };
};

/** Trois trous de plus en plus grands ; le dernier débouche sur la mer. */
export const ROUNDS: readonly RoundSpec[] = [round(160, 60), round(190, 90), round(220, 120)];
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
