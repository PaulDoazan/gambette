import * as THREE from 'three';

const PX_PER_UNIT = 128; // résolution du canvas par unité monde (hauteur d'un pavé = 1)
const MIN_WIDTH = 32;
const MAX_WIDTH = 1024;
const MAX_FONT_RATIO = 0.6; // police ≤ 60 % de la hauteur de la face
const MIN_FONT = 12;
const TEXT_WIDTH_RATIO = 0.9;
// Fond blanc : la texture est multipliée par la couleur du pavé (le pavé garde
// sa teinte), le texte sombre ressort par-dessus.
const BG = '#FFFFFF';
const FG = '#00274B'; // Oxford Blue

const fontOf = (px: number): string => `800 ${px}px system-ui, sans-serif`;

/** Dessine le libellé centré, police réduite jusqu'à tenir dans la face. */
export function drawCalcLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  width: number,
  height: number,
): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);
  let px = Math.floor(height * MAX_FONT_RATIO);
  ctx.font = fontOf(px);
  while (px > MIN_FONT && ctx.measureText(label).width > width * TEXT_WIDTH_RATIO) {
    px -= 2;
    ctx.font = fontOf(px);
  }
  ctx.fillStyle = FG;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);
}

/**
 * Texture du calcul résolu pour une face latérale d'un pavé posé.
 * `aspect` = longueur de la face / hauteur du pavé : le canvas épouse ces
 * proportions pour que le texte ne soit pas déformé.
 */
export function createCalcTexture(label: string, aspect: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.height = PX_PER_UNIT;
  canvas.width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(PX_PER_UNIT * aspect)));
  const ctx = canvas.getContext('2d');
  if (ctx) drawCalcLabel(ctx, label, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Faces d'un BoxGeometry : [+x, -x, +y, -y, +z, -z]. Caméra en (6,6,6) : les
// faces latérales visibles sont +x (longueur = profondeur) et +z (longueur = largeur).
const FACE_PX = 0;
const FACE_PZ = 4;

/** Face latérale visible la plus grande d'un pavé de dimensions width × depth. */
export function pickLabelFace(width: number, depth: number): { index: number; length: number } {
  return depth > width ? { index: FACE_PX, length: depth } : { index: FACE_PZ, length: width };
}
