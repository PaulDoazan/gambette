import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '@gambette/math-sdk';
import {
  CHANNEL_WIDTH,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  HOLE_RADIUS,
  MID_Y,
} from '../config/dimensions';
import { COLORS } from '../config/theme';

/** Contour un peu irrégulier du trou (rayon `r`, ondulation `wob` px), centré sur (cx, cy). */
export function wobblyCircle(cx: number, cy: number, r: number, wob: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rr = r + Math.sin(a * 5 + 1) * wob + Math.cos(a * 3) * wob * 0.6;
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  return pts;
}

/**
 * Décor fixe, lu à la création (la hauteur dépend de l'écran) : sable semé de grains, cailloux,
 * trou en cuvette au centre et canal creusé jusqu'au bord droit.
 */
export function createBeach(): { readonly view: Container } {
  const view = new Container();
  view.label = 'beach';
  const cx = DESIGN_WIDTH / 2;
  const cy = MID_Y;

  const sand = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(COLORS.sand);
  // Grains toujours au même endroit d'une partie à l'autre.
  const rng = mulberry32(7);
  for (let i = 0; i < 420; i++) {
    sand
      .circle(rng() * DESIGN_WIDTH, rng() * DESIGN_HEIGHT, 1 + rng() * 1.6)
      .fill({ color: rng() > 0.5 ? COLORS.sandGrainDark : COLORS.sandGrainLight, alpha: 0.55 });
  }
  for (const [x, y, r] of [
    [620, cy - 170, 10],
    [95, cy + 180, 8],
    [640, cy + 220, 7],
    [120, cy - 210, 9],
  ] as const) {
    sand
      .ellipse(x, y, r, r * 0.7)
      .fill(0xd9d2c3)
      .stroke({ width: 1.5, color: COLORS.pitLine });
  }

  // Canal : du trou au bord droit, à mi-hauteur.
  const ch = new Graphics();
  const x0 = cx + HOLE_RADIUS - 30;
  const half = CHANNEL_WIDTH / 2;
  ch.rect(x0, cy - half - 8, DESIGN_WIDTH - x0, CHANNEL_WIDTH + 16).fill(COLORS.rim);
  ch.rect(x0, cy - half, DESIGN_WIDTH - x0, CHANNEL_WIDTH).fill(COLORS.pit);
  ch.moveTo(x0, cy - half)
    .lineTo(DESIGN_WIDTH, cy - half)
    .moveTo(x0, cy + half)
    .lineTo(DESIGN_WIDTH, cy + half)
    .stroke({ width: 3, color: COLORS.pitLine });

  // Trou : bourrelet de sable, cuvette, anneaux de profondeur.
  const hole = new Graphics();
  hole.poly(wobblyCircle(cx, cy, HOLE_RADIUS + 22, 5)).fill(COLORS.rim);
  hole
    .poly(wobblyCircle(cx, cy, HOLE_RADIUS, 4))
    .fill(COLORS.pit)
    .stroke({ width: 3, color: COLORS.pitLine });
  for (const k of [0.78, 0.56, 0.34]) {
    hole
      .poly(wobblyCircle(cx, cy, HOLE_RADIUS * k, 3))
      .fill({ color: COLORS.pitDeep, alpha: 0.18 })
      .stroke({ width: 2, color: COLORS.pitLine, alpha: 0.25 });
  }
  view.addChild(sand, ch, hole);
  return { view };
}
