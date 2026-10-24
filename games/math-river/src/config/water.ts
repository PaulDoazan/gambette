/**
 * Niveau d'eau du trou, de 0 (fond) à 1 (niveau du canal : fin de manche). Apport d'un seau et
 * infiltration propres à chaque manche : voir rounds.ts.
 */
/** Plancher : il reste toujours un fond d'eau, le poisson y nage toujours. */
export const MIN_LEVEL = 0.12;
export const START_LEVEL = 0.2;
/** Sous ce niveau, le poisson se débat. */
export const STRUGGLE_LEVEL = 0.4;

/** Durée du vol de l'eau (ms) pour une portée donnée (px). */
export const flightMs = (range: number): number => 500 + 0.5 * range;
/** Durée du vidage d'un mauvais seau sur place, et de la vie d'une flaque. */
export const SPILL_MS = 500;
export const PUDDLE_MS = 1400;
