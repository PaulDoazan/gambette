import { Container, Graphics, TilingSprite } from 'pixi.js';
import { mulberry32 } from '@gambette/math-sdk';
import { POND_RADIUS } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Vec } from '../domain/types';
import { wobblyCircle } from './Beach';
import { makeCausticsTexture } from './WaterFx';

/** Rayon de la surface de l'eau de la mare. */
export const POND_WATER_R = POND_RADIUS - 14;
/** Durée de vie d'une onde (ms). */
const RIPPLE_MS = 900;

export interface Pond {
  /** Surface de l'eau (voile, reflets, vaguelettes), au-dessus du poisson. */
  readonly view: Container;
  /** Fond de sable mouillé vu à travers l'eau, sous le poisson. */
  readonly floor: Container;
  ripple(at: Vec): void;
  update(dtMs: number): void;
}

/** Reflets partagés par toutes les mares (texture générée une fois). */
let caustics: ReturnType<typeof makeCausticsTexture> | null = null;

/** Mare du poisson, centrée en `c` (coordonnées du monde) : eau translucide, fond de sable. */
export function createPond(c: Vec, seed: number): Pond {
  const r = POND_WATER_R;
  const shape = wobblyCircle(c.x, c.y, r, 3);

  const floor = new Container();
  const sand = new Graphics().circle(c.x, c.y, r + 4).fill(COLORS.floorSand);
  // Rides de sable laissées par l'eau.
  for (let i = -4; i <= 4; i++) {
    const y0 = c.y + i * (r / 4.5);
    sand.moveTo(c.x - r, y0);
    for (let x = -r; x <= r; x += 12) sand.lineTo(c.x + x, y0 + Math.sin(x / 22 + i) * 4);
  }
  sand.stroke({ width: 3, color: COLORS.floorRidge, alpha: 0.35, cap: 'round' });
  const rng = mulberry32(seed);
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    sand.circle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 0.8 + rng() * 1.4).fill({
      color: rng() > 0.5 ? COLORS.sandGrainDark : COLORS.sandGrainLight,
      alpha: 0.5,
    });
  }
  const floorMask = new Graphics().poly(shape).fill(0xffffff);
  sand.mask = floorMask;
  const tint = new Graphics();
  tint.poly(wobblyCircle(c.x, c.y, r + 10, 3)).fill({ color: COLORS.wetSand, alpha: 0.45 });
  tint
    .poly(shape)
    .fill({ color: COLORS.water, alpha: 0.5 })
    .stroke({ width: 2.5, color: COLORS.waterEdge });
  // Le sable se voit à travers l'eau translucide.
  floor.addChild(sand, floorMask, tint);

  caustics ??= makeCausticsTexture();
  const R = r + 8;
  const light = new TilingSprite({ texture: caustics, width: 2 * R, height: 2 * R });
  light.position.set(c.x - R, c.y - R);
  light.alpha = 0.12;
  light.blendMode = 'add';
  const lightMask = new Graphics().poly(shape).fill(0xffffff);
  light.mask = lightMask;
  const surface = new Graphics();
  const view = new Container();
  view.label = 'pond';
  view.addChild(light, lightMask, surface);

  let clock = 0;
  let ripples: { at: Vec; age: number }[] = [];

  const draw = (): void => {
    light.tilePosition.set(clock * 0.012, clock * 0.007);
    surface.clear();
    surface.poly(shape).fill({ color: COLORS.water, alpha: 0.3 });
    surface
      .circle(c.x - r * 0.2, c.y - r * 0.25, r * 0.45)
      .fill({ color: COLORS.waterLight, alpha: 0.12 });
    const sway = Math.sin(clock / 600) * r * 0.06;
    surface
      .moveTo(c.x - r * 0.5 + sway, c.y - r * 0.35)
      .quadraticCurveTo(c.x - r * 0.3 + sway, c.y - r * 0.47, c.x - r * 0.1 + sway, c.y - r * 0.35)
      .stroke({ width: 4, color: COLORS.foam, alpha: 0.7, cap: 'round' });
    surface
      .moveTo(c.x + r * 0.15 - sway, c.y + r * 0.5)
      .quadraticCurveTo(c.x + r * 0.3 - sway, c.y + r * 0.4, c.x + r * 0.45 - sway, c.y + r * 0.5)
      .stroke({ width: 3, color: COLORS.foam, alpha: 0.5, cap: 'round' });
    for (const rp of ripples) {
      const k = rp.age / RIPPLE_MS;
      surface
        .circle(rp.at.x, rp.at.y, 8 + 40 * k)
        .stroke({ width: 3, color: COLORS.foam, alpha: 1 - k });
    }
  };
  draw();

  return {
    view,
    floor,
    ripple: (at) => ripples.push({ at, age: 0 }),
    update: (dtMs) => {
      clock += dtMs;
      for (const rp of ripples) rp.age += dtMs;
      ripples = ripples.filter((rp) => rp.age < RIPPLE_MS);
      draw();
    },
  };
}
