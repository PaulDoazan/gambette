import { Container, Graphics } from 'pixi.js';
import {
  CHANNEL_WIDTH,
  DESIGN_WIDTH,
  HOLE_RADIUS,
  MID_Y,
  WATER_R_MAX,
  WATER_R_MIN,
} from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Vec } from '../domain/types';
import { wobblyCircle } from './Beach';

/** Rayon de la surface de l'eau pour un niveau ∈ [0, 1] (le trou est une cuvette). */
export const waterRadius = (level: number): number =>
  WATER_R_MIN + (WATER_R_MAX - WATER_R_MIN) * Math.min(1, Math.max(0, level));

/** Durée de vie d'une onde (ms) quand un seau tombe dans le trou. */
const RIPPLE_MS = 900;
/** Durée de remplissage du canal (ms) quand l'eau l'atteint. */
const CHANNEL_FILL_MS = 700;
/** Lissage visuel du niveau : l'eau monte et descend sans à-coups (fraction rattrapée par ms). */
const EASE_PER_MS = 0.006;

export interface Pool {
  readonly view: Container;
  /** Niveau affiché (lissé), qui suit le niveau réel. */
  shownLevel(): number;
  ripple(at: Vec): void;
  /** L'eau entre dans le canal (victoire). */
  overflow(): void;
  /** Un joueur vise le trou : les pointillés du niveau à atteindre passent au bleu. */
  setAimOnTarget(on: boolean): void;
  aimOnTarget(): boolean;
  update(level: number, dtMs: number): void;
  reset(level: number): void;
}

/** Cercle en pointillés (Graphics n'a pas de tirets). */
function dashedCircle(g: Graphics, cx: number, cy: number, r: number, dash: number): void {
  const n = Math.max(8, Math.round((2 * Math.PI * r) / (dash * 2)));
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n;
    g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).arc(cx, cy, r, a0, a1);
  }
}

export function createPool(startLevel: number): Pool {
  const view = new Container();
  view.label = 'pool';
  const cx = DESIGN_WIDTH / 2;
  const cy = MID_Y;
  const channel = new Graphics();
  const water = new Graphics();
  const marks = new Graphics();
  view.addChild(channel, water, marks);

  let shown = startLevel;
  let clock = 0;
  let channelFill: number | null = null;
  let aimOnTarget = false;
  let ripples: { at: Vec; age: number }[] = [];

  const draw = (): void => {
    const r = waterRadius(shown);
    water.clear();
    water.poly(wobblyCircle(cx, cy, r + 12, 3)).fill({ color: COLORS.wetSand, alpha: 0.45 });
    water
      .poly(wobblyCircle(cx, cy, r, 3))
      .fill(COLORS.water)
      .stroke({ width: 2.5, color: COLORS.waterEdge });
    water
      .circle(cx - r * 0.15, cy - r * 0.15, r * 0.6)
      .fill({ color: COLORS.waterLight, alpha: 0.35 });
    // Vaguelettes qui ondulent doucement.
    const sway = Math.sin(clock / 600) * r * 0.06;
    water
      .moveTo(cx - r * 0.5 + sway, cy - r * 0.35)
      .quadraticCurveTo(cx - r * 0.3 + sway, cy - r * 0.47, cx - r * 0.1 + sway, cy - r * 0.35)
      .stroke({ width: 4, color: COLORS.foam, alpha: 0.7, cap: 'round' });
    if (r > 70) {
      water
        .moveTo(cx + r * 0.15 - sway, cy + r * 0.5)
        .quadraticCurveTo(cx + r * 0.3 - sway, cy + r * 0.4, cx + r * 0.45 - sway, cy + r * 0.5)
        .stroke({ width: 3, color: COLORS.foam, alpha: 0.5, cap: 'round' });
    }
    for (const rp of ripples) {
      const k = rp.age / RIPPLE_MS;
      water.circle(rp.at.x, rp.at.y, 10 + 50 * k).stroke({
        width: 3,
        color: COLORS.foam,
        alpha: 1 - k,
      });
    }

    channel.clear();
    if (channelFill !== null) {
      const x0 = cx + HOLE_RADIUS - 40;
      const k = Math.min(1, channelFill / CHANNEL_FILL_MS);
      channel
        .rect(x0, cy - CHANNEL_WIDTH / 2 + 6, (DESIGN_WIDTH - x0) * k, CHANNEL_WIDTH - 12)
        .fill(COLORS.water);
      for (let x = x0 + 30; x < x0 + (DESIGN_WIDTH - x0) * k - 20; x += 60) {
        const dx = (clock / 8) % 60;
        channel
          .moveTo(x + dx, cy - 4)
          .quadraticCurveTo(x + dx + 12, cy - 12, x + dx + 24, cy - 4)
          .stroke({ width: 3, color: COLORS.foam, alpha: 0.7, cap: 'round' });
      }
    }

    // Repère du niveau à atteindre : celui du canal.
    marks.clear();
    if (channelFill === null) {
      dashedCircle(marks, cx, cy, WATER_R_MAX, 12);
      marks.stroke(
        aimOnTarget
          ? { width: 5, color: COLORS.guideOnTarget, alpha: 1 }
          : { width: 4, color: COLORS.guide, alpha: 0.75 },
      );
    }
  };
  draw();

  return {
    view,
    shownLevel: () => shown,
    ripple: (at) => {
      ripples.push({ at, age: 0 });
    },
    setAimOnTarget: (on) => {
      if (on === aimOnTarget) return;
      aimOnTarget = on;
      draw();
    },
    aimOnTarget: () => aimOnTarget,
    overflow: () => {
      channelFill ??= 0;
    },
    update: (level, dtMs) => {
      clock += dtMs;
      shown += (level - shown) * Math.min(1, EASE_PER_MS * dtMs);
      for (const rp of ripples) rp.age += dtMs;
      ripples = ripples.filter((rp) => rp.age < RIPPLE_MS);
      if (channelFill !== null) channelFill += dtMs;
      draw();
    },
    reset: (level) => {
      shown = level;
      ripples = [];
      channelFill = null;
      aimOnTarget = false;
      draw();
    },
  };
}
