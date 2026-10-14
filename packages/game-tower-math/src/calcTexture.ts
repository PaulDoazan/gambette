import * as THREE from 'three';

const SIZE = 256; // côté du canvas (px)
const MAX_FONT = 72;
const MIN_FONT = 24;
const MAX_TEXT_WIDTH = SIZE * 0.9;
// Fond blanc : la texture est multipliée par la couleur du pavé (le pavé garde
// sa teinte), le texte sombre ressort par-dessus.
const BG = '#FFFFFF';
const FG = '#00274B'; // Oxford Blue

const fontOf = (px: number): string => `800 ${px}px system-ui, sans-serif`;

/** Dessine le libellé centré, police réduite jusqu'à tenir dans la face. */
export function drawCalcLabel(ctx: CanvasRenderingContext2D, label: string): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);
  let px = MAX_FONT;
  ctx.font = fontOf(px);
  while (px > MIN_FONT && ctx.measureText(label).width > MAX_TEXT_WIDTH) {
    px -= 4;
    ctx.font = fontOf(px);
  }
  ctx.fillStyle = FG;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, SIZE / 2, SIZE / 2);
}

/** Texture du calcul résolu pour la face du dessus d'un pavé posé. */
export function createCalcTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) drawCalcLabel(ctx, label);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Caméra iso : la face du dessus apparaît en losange → texte redressé de 45°.
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI / 4;
  return tex;
}

/** Cache par libellé : un même calcul revient sur plusieurs étages. */
export function createLabelCache<T extends { dispose(): void }>(
  create: (label: string) => T,
): { get(label: string): T; dispose(): void } {
  const byLabel = new Map<string, T>();
  return {
    get(label: string): T {
      let item = byLabel.get(label);
      if (!item) {
        item = create(label);
        byLabel.set(label, item);
      }
      return item;
    },
    dispose(): void {
      byLabel.forEach((item) => item.dispose());
      byLabel.clear();
    },
  };
}
