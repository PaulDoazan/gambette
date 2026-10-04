export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;
/** Ligne médiane : sépare le camp B (haut) du camp A (bas). */
export const MID_Y = DESIGN_HEIGHT / 2;
export const PUCK_RADIUS = 56;
/** Nombre de palets par joueur : réglage de la partie. */
export const MIN_PUCKS = 5;
export const MAX_PUCKS = 10;
export const DEFAULT_PUCKS = 5;
/** Écart minimal entre deux palets posés au départ (px). */
export const PUCK_SPACING = 8;
/** Largeur du trou de la cloison : ≈ 1,6 × diamètre d'un palet. */
export const GAP_WIDTH = Math.round(PUCK_RADIUS * 2 * 1.6);
export const DIVIDER_THICKNESS = 20;
/** Distance entre l'élastique et le bord du joueur. */
export const ELASTIC_INSET = 150;
/** Étirement maximal de l'élastique (px). */
export const MAX_STRETCH = 110;

/** Bloc de calcul : en haut à droite du camp, du point de vue de son joueur (B est tourné de 180°). */
export const CALC_BLOCK_SIZE = { w: 230, h: 76 } as const;
const CALC_BLOCK_OFFSET = DIVIDER_THICKNESS / 2 + 24 + CALC_BLOCK_SIZE.h / 2;
export const CALC_BLOCK = {
  A: { x: DESIGN_WIDTH - 24 - CALC_BLOCK_SIZE.w / 2, y: MID_Y + CALC_BLOCK_OFFSET },
  B: { x: 24 + CALC_BLOCK_SIZE.w / 2, y: MID_Y - CALC_BLOCK_OFFSET },
} as const;
