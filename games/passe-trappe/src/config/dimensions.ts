export const DESIGN_WIDTH = 720;
/** Hauteur du plateau par défaut (écran 9:16) et maximale (écran très allongé). */
export const MIN_BOARD_HEIGHT = 1280;
export const MAX_BOARD_HEIGHT = 1800;
/**
 * Hauteur logique du plateau : la largeur est fixe (720), la hauteur suit les proportions de l'écran
 * pour l'occuper en entier (voir configureBoard). Les valeurs ci-dessous dépendant de la hauteur
 * sont des liaisons vivantes, recalculées par configureBoard.
 */
export let DESIGN_HEIGHT = MIN_BOARD_HEIGHT;
/** Ligne médiane : sépare le camp B (haut) du camp A (bas). */
export let MID_Y = DESIGN_HEIGHT / 2;
export const PUCK_RADIUS = 48;
/** Épaisseur d'un palet (px), visible sur la tranche quand il se retourne. */
export const PUCK_THICKNESS = 12;
/** Nombre de palets par joueur : réglage de la partie. */
export const MIN_PUCKS = 5;
export const MAX_PUCKS = 10;
export const DEFAULT_PUCKS = 5;
/** Écart minimal entre deux palets posés au départ (px). */
export const PUCK_SPACING = 8;
/** Largeur du trou de la cloison : ≈ 1,6 × diamètre d'un palet. */
export const GAP_WIDTH = Math.round(PUCK_RADIUS * 2 * 1.6);
/**
 * Bande (px écran) que la cloison doit couvrir : tout juste la hauteur du plus haut des boutons
 * posés dessus (l'engrenage, 40 px ; quitter et plein écran sont moins hauts).
 */
export const UI_BAND_PX = 40;
const MIN_DIVIDER_THICKNESS = 20;
/** Épaisseur de la cloison (unités plateau) pour une échelle écran/plateau donnée. */
const dividerFor = (scale: number): number =>
  Math.max(MIN_DIVIDER_THICKNESS, Math.ceil(UI_BAND_PX / scale));
/** Épaisseur de la cloison : liaison vivante, recalculée par configureBoard selon l'échelle. */
export let DIVIDER_THICKNESS = dividerFor(1);
/**
 * Zone interdite au glisser : demi-cercle de ce rayon centré sur le passage, dans chaque camp
 * (pointillés à l'écran). Un palet tenu reste entièrement dehors : il ne peut pas pousser les
 * autres à travers le trou.
 */
export const NO_DRAG_RADIUS = 180;
/** Distance entre l'élastique et le bord du joueur. */
export const ELASTIC_INSET = 150;
/** Étirement maximal de l'élastique (px). */
export const MAX_STRETCH = 110;

/** Bloc de calcul : en haut à droite du camp, du point de vue de son joueur (B est tourné de 180°). */
export const CALC_BLOCK_SIZE = { w: 230, h: 76 } as const;
type Point = { readonly x: number; readonly y: number };
const calcBlocks = (mid: number): { readonly A: Point; readonly B: Point } => {
  const offset = DIVIDER_THICKNESS / 2 + 24 + CALC_BLOCK_SIZE.h / 2;
  return {
    A: { x: DESIGN_WIDTH - 24 - CALC_BLOCK_SIZE.w / 2, y: mid + offset },
    B: { x: 24 + CALC_BLOCK_SIZE.w / 2, y: mid - offset },
  };
};
export let CALC_BLOCK = calcBlocks(MID_Y);

/** Hauteur de plateau qui remplit un écran `width` × `height` (bornée à [MIN, MAX]). */
export function boardHeightFor(width: number, height: number): number {
  if (width <= 0 || height <= 0) return MIN_BOARD_HEIGHT;
  const h = Math.round((DESIGN_WIDTH * height) / width);
  return Math.min(MAX_BOARD_HEIGHT, Math.max(MIN_BOARD_HEIGHT, h));
}

/**
 * Fixe la hauteur du plateau (au montage, avant de créer l'application et la partie) et recalcule
 * tout ce qui en dépend : ligne médiane, épaisseur de la cloison (selon `scale`, px écran par
 * unité plateau), blocs de calcul. Les élastiques, les murs et la disposition des palets lisent
 * ces valeurs au moment de leur création.
 */
export function configureBoard(height: number, scale = 1): void {
  DESIGN_HEIGHT = Math.min(MAX_BOARD_HEIGHT, Math.max(MIN_BOARD_HEIGHT, Math.round(height)));
  MID_Y = DESIGN_HEIGHT / 2;
  DIVIDER_THICKNESS = dividerFor(scale);
  CALC_BLOCK = calcBlocks(MID_Y);
}
