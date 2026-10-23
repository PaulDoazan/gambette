/**
 * Niveau d'eau du trou, de 0 (fond) à 1 (niveau du canal : victoire). Calibrage : une paire qui
 * réussit un seau toutes les ~6 s chacun gagne en 1 à 2 minutes.
 */
/** Plancher : il reste toujours un fond d'eau, le poisson y nage toujours. */
export const MIN_LEVEL = 0.12;
export const START_LEVEL = 0.2;
/** Apport d'un bon seau tombé dans le trou. */
export const WATER_PER_BUCKET = 0.12;
/** Infiltration continue au fond du trou (niveau perdu par seconde). */
export const DRAIN_PER_SECOND = 0.018;
/** Sous ce niveau, le poisson se débat. */
export const STRUGGLE_LEVEL = 0.4;

/** Durée du vol de l'eau (ms) pour une portée donnée (px). */
export const flightMs = (range: number): number => 500 + 0.5 * range;
/** Durée de l'évasion du poisson par le canal, avant l'écran de victoire. */
export const ESCAPE_MS = 2200;
/** Durée du vidage d'un mauvais seau sur place, et de la vie d'une flaque. */
export const SPILL_MS = 500;
export const PUDDLE_MS = 1400;
