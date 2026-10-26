import { Container, Graphics, Text } from 'pixi.js';
import { PUDDLE_MS } from '../config/water';
import { COLORS } from '../config/theme';
import { flightAt } from '../domain/aim';
import type { Player, Vec } from '../domain/types';
import { SAND_DRY } from './SandSplash';

/** Hauteur apparente maximale de l'eau en vol (px vers le haut de l'écran). */
const APEX = 40;

/** Bord plus foncé du sable en vol. */
const SAND_EDGE = 0xa5814b;

/**
 * Gerbe en vol, vue du dessus : de l'eau (bon seau) ou du sable (mauvais seau). Elle s'élève
 * (grossit) au-dessus de son ombre.
 */
export function createShot(load: 'water' | 'sand'): {
  readonly view: Container;
  update(from: Vec, to: Vec, t: number): void;
} {
  const view = new Container();
  view.label = load === 'water' ? 'shot' : 'sand-shot';
  const fill = load === 'water' ? COLORS.water : SAND_DRY;
  const edge = load === 'water' ? COLORS.waterEdge : SAND_EDGE;
  const shadow = new Graphics().ellipse(0, 0, 34, 14).fill({ color: 0x000000, alpha: 0.15 });
  const blob = new Graphics();
  blob
    .poly([0, -34, 26, -24, 34, 6, 16, 28, -8, 32, -30, 14, -34, -10, -20, -30])
    .fill(fill)
    .stroke({ width: 3, color: edge, join: 'round' });
  for (const [x, y, r] of [
    [-28, -42, 8],
    [24, -46, 6],
    [-4, -62, 5],
  ] as const) {
    blob.circle(x, y, r).fill(fill).stroke({ width: 2, color: edge });
  }
  if (load === 'sand') {
    // Grains plus sombres dans la masse de sable.
    for (const [x, y] of [
      [-14, -12],
      [10, -18],
      [18, 8],
      [-4, 14],
      [-20, 6],
      [4, -2],
    ] as const) {
      blob.circle(x, y, 2.5).fill(SAND_EDGE);
    }
  }
  view.addChild(shadow, blob);
  return {
    view,
    update: (from, to, t) => {
      const f = flightAt(from, to, t);
      shadow.position.set(f.x, f.y);
      blob.position.set(f.x, f.y - f.lift * APEX);
      blob.scale.set(0.6 + 0.5 * f.lift);
      blob.rotation = t * 1.2;
    },
  };
}

/**
 * Flaque sur le sable : eau tombée à côté du trou, avec « À côté ! » tourné vers le joueur qui a
 * tiré. Elle s'efface en PUDDLE_MS.
 */
export function createPuddle(
  at: Vec,
  missBy: Player,
): { readonly view: Container; update(dtMs: number): boolean } {
  const view = new Container();
  view.label = 'miss';
  view.position.set(at.x, at.y);
  const g = new Graphics();
  g.poly([-50, -4, -30, -34, 10, -30, 46, -14, 50, 18, 20, 38, -24, 34, -48, 18]).fill({
    color: COLORS.puddle,
    alpha: 0.55,
  });
  for (const [x, y, r] of [
    [-62, -20, 7],
    [60, -6, 6],
    [44, 46, 5],
    [-52, 40, 6],
  ] as const) {
    g.circle(x, y, r).fill({ color: COLORS.puddle, alpha: 0.55 });
  }
  view.addChild(g);
  const label = new Container();
  label.rotation = missBy === 'B' ? Math.PI : 0;
  label.position.set(0, missBy === 'B' ? 64 : -64);
  label.addChild(
    new Graphics()
      .roundRect(-74, -24, 148, 48, 24)
      .fill(COLORS.calcFill)
      .stroke({ width: 3, color: COLORS.calcText }),
  );
  const text = new Text({
    text: 'À côté !',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 26,
      fontWeight: '800',
      fill: COLORS.miss,
    },
  });
  text.anchor.set(0.5);
  label.addChild(text);
  view.addChild(label);
  let age = 0;
  return {
    view,
    update: (dtMs) => {
      age += dtMs;
      const t = age / PUDDLE_MS;
      // Visible franchement, puis s'efface sur le dernier tiers.
      view.alpha = t < 2 / 3 ? 1 : Math.max(0, 3 * (1 - t));
      return age < PUDDLE_MS;
    },
  };
}
