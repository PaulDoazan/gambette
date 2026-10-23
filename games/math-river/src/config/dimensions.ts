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
/** Ligne médiane : sépare la moitié de B (haut) de celle de A (bas). */
export let MID_Y = DESIGN_HEIGHT / 2;

/** Trou au centre du plateau. */
export const HOLE_RADIUS = 160;
/** Canal : du bord droit du trou jusqu'au bord droit de l'écran, à mi-hauteur. */
export const CHANNEL_WIDTH = 56;
/** Rayon de la surface de l'eau au niveau 0 et au niveau 1 (celui du canal). */
export const WATER_R_MIN = 36;
export const WATER_R_MAX = HOLE_RADIUS - 22;

/** Seaux : 5 par joueur, en ligne, à BUCKET_INSET du bord du joueur. */
export const BUCKETS_PER_PLAYER = 5;
export const BUCKET_RADIUS = 46;
export const BUCKET_INSET = 180;
export const bucketX = (i: number): number => 80 + i * 140;

/** Tir : étirement maximal du seau (px), seuil sous lequel il n'y a pas de tir, portée maximale. */
export const MAX_STRETCH = 150;
export const MIN_STRETCH = 24;
export const MAX_RANGE = 760;

/** Bloc de calcul : A à droite au-dessus de ses seaux, B à gauche (tourné de 180°). */
export const CALC_BLOCK_SIZE = { w: 250, h: 76 } as const;
type Point = { readonly x: number; readonly y: number };
const CALC_GAP = 70;
const calcBlocks = (height: number): { readonly A: Point; readonly B: Point } => {
  const offset = BUCKET_INSET + BUCKET_RADIUS + CALC_GAP + CALC_BLOCK_SIZE.h / 2;
  return {
    A: { x: DESIGN_WIDTH - 24 - CALC_BLOCK_SIZE.w / 2, y: height - offset },
    B: { x: 24 + CALC_BLOCK_SIZE.w / 2, y: offset },
  };
};
export let CALC_BLOCK = calcBlocks(DESIGN_HEIGHT);

/** Hauteur de plateau qui remplit un écran `width` × `height` (bornée à [MIN, MAX]). */
export function boardHeightFor(width: number, height: number): number {
  if (width <= 0 || height <= 0) return MIN_BOARD_HEIGHT;
  const h = Math.round((DESIGN_WIDTH * height) / width);
  return Math.min(MAX_BOARD_HEIGHT, Math.max(MIN_BOARD_HEIGHT, h));
}

/**
 * Fixe la hauteur du plateau (au montage, avant de créer l'application et la partie) et recalcule
 * tout ce qui en dépend : ligne médiane, blocs de calcul. Les seaux et le trou lisent ces valeurs au
 * moment de leur création.
 */
export function configureBoard(height: number): void {
  DESIGN_HEIGHT = Math.min(MAX_BOARD_HEIGHT, Math.max(MIN_BOARD_HEIGHT, Math.round(height)));
  MID_Y = DESIGN_HEIGHT / 2;
  CALC_BLOCK = calcBlocks(DESIGN_HEIGHT);
}
