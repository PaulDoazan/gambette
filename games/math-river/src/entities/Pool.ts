import { Container, Graphics, TilingSprite } from 'pixi.js';
import { mulberry32 } from '@gambette/math-sdk';
import { WATER_R_MIN } from '../config/dimensions';
import { PAN_MS, holeCenterOf, waterRadiusMax } from '../config/rounds';
import { COLORS } from '../config/theme';
import { channelFrom } from '../domain/channel';
import type { Vec } from '../domain/types';
import { wobblyCircle } from './Beach';
import { makeCausticsTexture } from './WaterFx';

/** Rayon de la surface de l'eau du trou k pour un niveau ∈ [0, 1] (le trou est une cuvette). */
export const waterRadius = (level: number, k: number): number =>
  WATER_R_MIN + (waterRadiusMax(k) - WATER_R_MIN) * Math.min(1, Math.max(0, level));

/** Durée de vie d'une onde (ms) quand un seau tombe dans le trou. */
const RIPPLE_MS = 900;
/** Durée de remplissage du canal (ms) quand l'eau l'atteint. */
const CHANNEL_FILL_MS = 700;
/** Durée du vidage du canal derrière le poisson (ms). */
export const CHANNEL_DRAIN_MS = 0.6 * PAN_MS;
/** Lissage visuel du niveau : l'eau monte et descend sans à-coups (fraction rattrapée par ms). */
const EASE_PER_MS = 0.006;

export interface Pool {
  /** Surface de l'eau (teinte translucide, reflets, vaguelettes) et eau du canal. */
  readonly view: Container;
  /** Fond du trou vu à travers l'eau (sable mouillé), sous le poisson. */
  readonly floor: Container;
  /** Repère du niveau à atteindre, au-dessus de l'eau et hors de ses effets. */
  readonly marks: Container;
  /** Niveau affiché (lissé), qui suit le niveau réel. */
  shownLevel(): number;
  /** Contour de la surface de l'eau du trou, au niveau affiché (coordonnées du monde). */
  waterShape(): number[];
  ripple(at: Vec): void;
  /** L'eau entre dans le canal (fin de manche). */
  overflow(): void;
  /** Le canal se vide derrière le poisson (transition vers le trou suivant). */
  drain(): void;
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

/** Reflets partagés par tous les trous (texture générée une fois). */
let caustics: ReturnType<typeof makeCausticsTexture> | null = null;

/** Fond de sable mouillé du trou k : grain et rides laissées par l'eau, toujours les mêmes. */
function drawSandFloor(g: Graphics, cx: number, cy: number, r: number, k: number): void {
  g.circle(cx, cy, r).fill(COLORS.floorSand);
  // Rides de sable : de longues ondulations parallèles, un peu de travers.
  for (let i = -6; i <= 6; i++) {
    const y0 = cy + i * (r / 6.5);
    g.moveTo(cx - r, y0);
    for (let x = -r; x <= r; x += 12) {
      g.lineTo(cx + x, y0 + Math.sin(x / 26 + i) * 5 + x * 0.12);
    }
  }
  g.stroke({ width: 3, color: COLORS.floorRidge, alpha: 0.35, cap: 'round' });
  const rng = mulberry32(11 + k);
  for (let i = 0; i < 160 + k * 60; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    g.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.8 + rng() * 1.4).fill({
      color: rng() > 0.5 ? COLORS.sandGrainDark : COLORS.sandGrainLight,
      alpha: 0.5,
    });
  }
}

/** Eau du trou k et de son canal de sortie, en coordonnées du monde. */
export function createPool(k: number, startLevel: number): Pool {
  const view = new Container();
  view.label = 'pool';
  const { x: cx, y: cy } = holeCenterOf(k);
  const path = channelFrom(k);
  const channel = new Graphics();
  const water = new Graphics();
  const marks = new Graphics();
  const marksView = new Container();
  marksView.addChild(marks);

  // Fond : sable mouillé, visible seulement sous l'eau.
  const floor = new Container();
  const sand = new Graphics();
  drawSandFloor(sand, cx, cy, waterRadiusMax(k) + 4, k);
  const floorMask = new Graphics();
  sand.mask = floorMask;
  floor.addChild(sand, floorMask, water);

  // Reflets de soleil qui glissent sur le fond, à travers l'eau.
  caustics ??= makeCausticsTexture();
  const R = waterRadiusMax(k) + 12;
  const light = new TilingSprite({ texture: caustics, width: 2 * R, height: 2 * R });
  light.position.set(cx - R, cy - R);
  light.alpha = 0.1;
  light.blendMode = 'add';
  const lightMask = new Graphics();
  light.mask = lightMask;
  const surface = new Graphics();
  view.addChild(channel, light, lightMask, surface);

  let shown = startLevel;
  let clock = 0;
  let channelFill: number | null = null;
  let channelDrain: number | null = null;
  let aimOnTarget = false;
  let ripples: { at: Vec; age: number }[] = [];

  const draw = (): void => {
    const r = waterRadius(shown, k);
    const shape = wobblyCircle(cx, cy, r, 3);
    floorMask.clear().poly(shape).fill(0xffffff);
    lightMask.clear().poly(shape).fill(0xffffff);
    light.tilePosition.set(clock * 0.012, clock * 0.007);
    water.clear();
    water.poly(wobblyCircle(cx, cy, r + 12, 3)).fill({ color: COLORS.wetSand, alpha: 0.45 });
    // Eau translucide : on voit le fond et le poisson à travers.
    water
      .poly(shape)
      .fill({ color: COLORS.water, alpha: 0.5 })
      .stroke({ width: 2.5, color: COLORS.waterEdge });
    surface.clear();
    // Voile d'eau au-dessus du poisson : il nage dedans, pas dessus.
    surface.poly(shape).fill({ color: COLORS.water, alpha: 0.3 });
    surface
      .circle(cx - r * 0.2, cy - r * 0.25, r * 0.45)
      .fill({ color: COLORS.waterLight, alpha: 0.12 });
    // Vaguelettes qui ondulent doucement.
    const sway = Math.sin(clock / 600) * r * 0.06;
    surface
      .moveTo(cx - r * 0.5 + sway, cy - r * 0.35)
      .quadraticCurveTo(cx - r * 0.3 + sway, cy - r * 0.47, cx - r * 0.1 + sway, cy - r * 0.35)
      .stroke({ width: 4, color: COLORS.foam, alpha: 0.7, cap: 'round' });
    if (r > 70) {
      surface
        .moveTo(cx + r * 0.15 - sway, cy + r * 0.5)
        .quadraticCurveTo(cx + r * 0.3 - sway, cy + r * 0.4, cx + r * 0.45 - sway, cy + r * 0.5)
        .stroke({ width: 3, color: COLORS.foam, alpha: 0.5, cap: 'round' });
    }
    for (const rp of ripples) {
      const k = rp.age / RIPPLE_MS;
      surface.circle(rp.at.x, rp.at.y, 10 + 50 * k).stroke({
        width: 3,
        color: COLORS.foam,
        alpha: 1 - k,
      });
    }

    channel.clear();
    if (channelDrain !== null) {
      // Le canal se vide depuis le trou ; il reste du sable mouillé derrière l'eau.
      const d = Math.min(1, channelDrain / CHANNEL_DRAIN_MS);
      channel.poly(path.outline(-6)).fill({ color: COLORS.wetSand, alpha: 0.45 });
      if (d < 0.98) channel.poly(path.outline(-6, d, 1)).fill({ color: COLORS.water, alpha: 0.6 });
    } else if (channelFill !== null) {
      // L'eau gagne le canal depuis le trou et suit ses méandres jusqu'au bout.
      const f = Math.min(1, channelFill / CHANNEL_FILL_MS);
      channel
        .poly(path.outline(-6, 0, Math.max(0.02, f)))
        .fill({ color: COLORS.water, alpha: 0.6 });
      for (let j = 0; j < 5; j++) {
        const t = (j / 5 + clock / 3000) % 1;
        if (t < 0.15 || t > f - 0.05) continue;
        const a = path.center(t - 0.03);
        const b = path.center(t + 0.03);
        channel
          .moveTo(a.x, a.y - 4)
          .lineTo(b.x, b.y - 4)
          .stroke({ width: 3, color: COLORS.foam, alpha: 0.7, cap: 'round' });
      }
    }

    // Repère du niveau à atteindre : celui du canal.
    marks.clear();
    if (channelFill === null) {
      dashedCircle(marks, cx, cy, waterRadiusMax(k), 12);
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
    floor,
    marks: marksView,
    shownLevel: () => shown,
    waterShape: () => wobblyCircle(cx, cy, waterRadius(shown, k), 3),
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
    drain: () => {
      channelFill ??= CHANNEL_FILL_MS;
      channelDrain ??= 0;
    },
    update: (level, dtMs) => {
      clock += dtMs;
      shown += (level - shown) * Math.min(1, EASE_PER_MS * dtMs);
      for (const rp of ripples) rp.age += dtMs;
      ripples = ripples.filter((rp) => rp.age < RIPPLE_MS);
      if (channelFill !== null) channelFill += dtMs;
      if (channelDrain !== null) channelDrain += dtMs;
      draw();
    },
    reset: (level) => {
      shown = level;
      ripples = [];
      channelFill = null;
      channelDrain = null;
      aimOnTarget = false;
      draw();
    },
  };
}
