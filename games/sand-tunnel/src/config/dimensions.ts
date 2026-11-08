import type { Vec } from '../domain/types';

export const DESIGN_WIDTH = 720;
/** Hauteur du plateau par défaut (écran 9:16) et maximale (écran très allongé). */
export const MIN_BOARD_HEIGHT = 1280;
export const MAX_BOARD_HEIGHT = 1800;
/**
 * Hauteur logique du plateau : la largeur est fixe (720), la hauteur suit les proportions de
 * l'écran (voir configureBoard). Liaison vivante, recalculée par configureBoard.
 */
export let DESIGN_HEIGHT = MIN_BOARD_HEIGHT;

/** Trois réseaux, un par écran, côte à côte dans le monde ; le dernier débouche sur la mer. */
export const SCREENS = 3;
export const LAST_SCREEN = SCREENS - 1;

/** Mare du poisson, au départ de chaque réseau. */
export const POND_RADIUS = 88;
/** Sortie d'un réseau : petit trou d'où part le canal vers l'écran suivant. */
export const EXIT_RADIUS = 30;
/** Largeur du canal qui relie une sortie à la mare suivante (ou à la mer). */
export const CHANNEL_WIDTH = 40;
/** Galets du réseau : rayon d'un nombre, demi-côté d'un opérateur, rayon de prise du doigt. */
export const NODE_RADIUS = 42;
export const OP_HALF = 38;
export const HIT_RADIUS = 58;
/** Largeur d'une galerie creusée, et d'un sillon (liaison possible). */
export const GALLERY_WIDTH = 34;
export const GROOVE_WIDTH = 12;

/** Mare à gauche, sortie à droite (abscisses dans un écran). */
const POND_X = 150;
const EXIT_X = 600;
/** Hauteurs des mares et des sorties : en haut ou en bas, en alternant d'un écran à l'autre. */
const TOP_Y = 300;
const bottomY = (): number => DESIGN_HEIGHT - 200;

/** Mare du réseau k (coordonnées du monde) : en bas sur les écrans pairs, en haut sinon. */
export const pondOf = (k: number): Vec => ({
  x: k * DESIGN_WIDTH + POND_X,
  y: k % 2 === 0 ? bottomY() : TOP_Y,
});

/** Sortie du réseau k : à la hauteur de la mare suivante, qu'un canal droit rejoint. */
export const exitOf = (k: number): Vec => ({
  x: k * DESIGN_WIDTH + EXIT_X,
  y: k % 2 === 0 ? TOP_Y : bottomY(),
});

/** Bord du rivage, dans le dernier écran (abscisse du monde). */
export const SEA_SHORE_X = (): number => LAST_SCREEN * DESIGN_WIDTH + 690;

/** Canal de sortie du réseau k : de la sortie jusqu'à la mare suivante, ou jusque dans la mer. */
export const channelOf = (k: number): readonly Vec[] => {
  const from = exitOf(k);
  const to = k < LAST_SCREEN ? pondOf(k + 1) : { x: SEA_SHORE_X() + 60, y: from.y };
  return [from, to];
};

/** Panneau du résultat, fixe à l'écran : en haut, au centre. */
export const RESULT_PANEL = { x: DESIGN_WIDTH / 2, y: 110, w: 300, h: 96 } as const;

/** Zone où poser les galets, dans un écran (le bandeau des boutons est au bord gauche). */
export const networkArea = (): { minX: number; maxX: number; minY: number; maxY: number } => ({
  minX: 150,
  maxX: 590,
  minY: RESULT_PANEL.y + RESULT_PANEL.h / 2 + NODE_RADIUS + 24,
  maxY: DESIGN_HEIGHT - 70,
});

/** Hauteur de plateau qui remplit un écran `width` × `height` (bornée à [MIN, MAX]). */
export function boardHeightFor(width: number, height: number): number {
  if (width <= 0 || height <= 0) return MIN_BOARD_HEIGHT;
  const h = Math.round((DESIGN_WIDTH * height) / width);
  return Math.min(MAX_BOARD_HEIGHT, Math.max(MIN_BOARD_HEIGHT, h));
}

/** Fixe la hauteur du plateau, au montage, avant de créer l'application et la partie. */
export function configureBoard(height: number): void {
  DESIGN_HEIGHT = Math.min(MAX_BOARD_HEIGHT, Math.max(MIN_BOARD_HEIGHT, Math.round(height)));
}
