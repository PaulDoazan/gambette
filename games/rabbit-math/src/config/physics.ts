import { DESIGN_HEIGHT, DESIGN_WIDTH } from './dimensions';

/** Échelle planck : pixels par mètre. */
export const PX_PER_M = 50;
/** Pas de référence (unité des vitesses « px par frame »). */
export const FRAME_S = 1 / 60;
/**
 * Gravité en m/s². Équivalent de l'ancien `gravity.y = 0.7` de matter-js
 * (0,7 × 0,001 px/ms² = 700 px/s² = 14 m/s² à 50 px/m, porté à 14,15 pour
 * compenser l'écart d'intégration Verlet / Euler semi-implicite). Calibré par
 * tests/core/trajectory.golden.spec.ts.
 */
export const GRAVITY_M_S2 = 14.15;
/**
 * Amortissement linéaire planck équivalent au `frictionAir` 0,01 par défaut de
 * matter-js (v ← v × 0,99 par frame ⇒ 1 / (1 + d/60) = 0,99 ⇒ d ≈ 0,606).
 * Calibré par tests/core/trajectory.golden.spec.ts.
 */
export const CARROT_LINEAR_DAMPING = 0.606;
export const CARROT_RADIUS = 9;
export const CARROT_DENSITY = 0.0014;
export const CARROT_FRICTION = 0.05;
export const CARROT_RESTITUTION = 0.2;
export const SLINGSHOT_MAX_PULL = 130;
export const SLINGSHOT_POWER = 0.16;
export const WORLD_BOUNDS = { minX: 0, minY: 0, maxX: DESIGN_WIDTH, maxY: DESIGN_HEIGHT };
