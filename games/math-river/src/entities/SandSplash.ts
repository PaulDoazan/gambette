import { Container, Graphics, Particle, ParticleContainer, Texture } from 'pixi.js';
import type { Rng } from '@gambette/math-sdk';
import { SAND_MS } from '../config/water';
import { COLORS } from '../config/theme';
import type { Vec } from '../domain/types';

/** Sable sec d'un mauvais seau : un peu plus clair que le sable mouillé (COLORS.wetSand). */
export const SAND_DRY = 0xdcb877;
/** Nuances des grains secs, toutes plus claires que le sable mouillé. */
const DRY_TINTS = [SAND_DRY, 0xe8cc92, 0xcfa964] as const;

const GRAINS = 64;
/** Diamètre de la texture d'un grain (px) ; chaque grain a sa propre échelle. */
const GRAIN_PX = 8;
/** Portée maximale des grains depuis le point d'impact (px). */
const REACH = 90;
/** Les grains s'étalent en SPREAD_MS, freinés par le sable ou l'eau. */
const SPREAD_MS = 420;
/** Dans l'eau : chaque grain se mouille en WET_MS, du centre vers les bords. */
const WET_MS = 320;
/** Le sable mouillé coule (s'efface) sur le dernier tiers de SAND_MS. */
const SINK_FROM = 2 / 3;

/** Petit disque blanc, teint grain par grain (texture neutre sans canvas, dans les tests). */
let grainTexture: Texture | null = null;
const grain = (): Texture => {
  if (grainTexture) return grainTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = GRAIN_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(GRAIN_PX / 2, GRAIN_PX / 2, GRAIN_PX / 2, 0, Math.PI * 2);
  ctx.fill();
  grainTexture = Texture.from(canvas);
  return grainTexture;
};

/** Couleur entre `a` (t ≤ 0) et `b` (t ≥ 1). */
const mix = (a: number, b: number, t: number): number => {
  const k = Math.max(0, Math.min(1, t));
  const ch = (shift: number): number => {
    const x = (a >> shift) & 0xff;
    const y = (b >> shift) & 0xff;
    return Math.round(x + (y - x) * k) << shift;
  };
  return ch(16) | ch(8) | ch(0);
};

const easeOut = (t: number): number => 1 - (1 - Math.min(1, t)) ** 3;

interface Grain {
  particle: Particle;
  dx: number;
  dy: number;
  dry: number;
  /** Début du mouillage (ms) : les grains du centre se mouillent les premiers. */
  wetAt: number;
}

/**
 * Sable d'un mauvais seau, à l'impact : les grains (ParticleContainer de Pixi, position et teinte
 * animées) jaillissent et s'étalent sur une tache qui s'élargit. Dans l'eau du trou, le sable
 * passe du sec au mouillé puis coule ; sur la plage, il reste sec et s'efface. Vit SAND_MS.
 */
export function createSandSplash(
  at: Vec,
  inWater: boolean,
  rng: Rng = Math.random,
): {
  readonly view: Container;
  readonly grains: ParticleContainer<Particle>;
  update(dtMs: number): boolean;
} {
  const view = new Container();
  view.label = inWater ? 'sand-in-water' : 'sand-on-beach';
  view.position.set(at.x, at.y);

  const stain = new Graphics();
  const pts: number[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const r = 34 + rng() * 14;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  stain.poly(pts).fill({ color: 0xffffff, alpha: 0.75 });
  stain.tint = SAND_DRY;

  const grains = new ParticleContainer<Particle>({
    texture: grain(),
    dynamicProperties: { position: true, vertex: true, color: true },
  });
  const list: Grain[] = [];
  for (let k = 0; k < GRAINS; k++) {
    const a = rng() * Math.PI * 2;
    // Plus de grains près du centre que loin : le sable retombe en tas qui s'étale.
    const r = REACH * (0.2 + 0.8 * Math.sqrt(rng()));
    const dry = DRY_TINTS[k % DRY_TINTS.length]!;
    const particle = new Particle({
      texture: grain(),
      anchorX: 0.5,
      anchorY: 0.5,
      scaleX: 0.5 + rng(),
      scaleY: 0.5 + rng(),
      tint: dry,
    });
    grains.addParticle(particle);
    list.push({
      particle,
      dx: Math.cos(a) * r,
      dy: Math.sin(a) * r,
      dry,
      wetAt: 0.3 * SPREAD_MS + (r / REACH) * 0.6 * SPREAD_MS,
    });
  }
  view.addChild(stain, grains);

  let age = 0;
  const draw = (): void => {
    const s = easeOut(age / SPREAD_MS);
    stain.scale.set(0.3 + 0.7 * s);
    for (const g of list) {
      g.particle.x = g.dx * s;
      g.particle.y = g.dy * s;
      if (inWater) g.particle.tint = mix(g.dry, COLORS.wetSand, (age - g.wetAt) / WET_MS);
    }
    if (inWater) stain.tint = mix(SAND_DRY, COLORS.wetSand, (age - 0.3 * SPREAD_MS) / WET_MS);
    const t = age / SAND_MS;
    view.alpha = t < SINK_FROM ? 1 : Math.max(0, (1 - t) / (1 - SINK_FROM));
  };
  draw();

  return {
    view,
    grains,
    update: (dtMs) => {
      age += dtMs;
      draw();
      return age < SAND_MS;
    },
  };
}
