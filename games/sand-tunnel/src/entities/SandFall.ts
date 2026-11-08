import { Container, Graphics, Particle, ParticleContainer, Texture } from 'pixi.js';
import type { Rng } from '@gambette/math-sdk';
import type { Vec } from '../domain/types';

/** Sable sec, et ses nuances. */
export const SAND_DRY = 0xdcb877;
const TINTS = [SAND_DRY, 0xe8cc92, 0xcfa964, 0xc9a466] as const;

const GRAINS = 90;
const GRAIN_PX = 8;
/** Les grains tombent de FALL_FROM px au-dessus, en FALL_MS au plus (les premiers d'abord). */
const FALL_FROM = 120;
const FALL_MS = 520;
/** Le tas reste, puis s'efface sur les FADE_MS dernières ms. */
export const SAND_FALL_MS = 1500;
const FADE_MS = 350;

let grainTexture: Texture | null = null;
const grain = (): Texture => {
  if (grainTexture) return grainTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = GRAIN_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE; // pas de canvas (tests) : texture neutre
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(GRAIN_PX / 2, GRAIN_PX / 2, GRAIN_PX / 2, 0, Math.PI * 2);
  ctx.fill();
  grainTexture = Texture.from(canvas);
  return grainTexture;
};

interface Grain {
  particle: Particle;
  x: number;
  y: number;
  delay: number;
}

export interface SandFall {
  readonly view: Container;
  /** Faux quand le tas a disparu. */
  update(dtMs: number): boolean;
}

/**
 * Sable qui s'effondre sur un galet fautif : les grains pleuvent d'en haut et forment un tas qui
 * bouche le passage (l'eau ne peut pas passer), puis le tas s'efface.
 */
export function createSandFall(at: Vec, radius: number, rng: Rng = Math.random): SandFall {
  const view = new Container();
  view.label = 'sand-fall';
  view.position.set(at.x, at.y);
  const mound = new Graphics();
  const pts: number[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const r = radius * (0.92 + rng() * 0.22);
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  mound.poly(pts).fill(SAND_DRY).stroke({ width: 3, color: 0xb8935a });
  const grains = new ParticleContainer<Particle>({
    texture: grain(),
    dynamicProperties: { position: true, color: true },
  });
  const list: Grain[] = [];
  for (let k = 0; k < GRAINS; k++) {
    const a = rng() * Math.PI * 2;
    const r = radius * 1.1 * Math.sqrt(rng());
    const particle = new Particle({
      texture: grain(),
      anchorX: 0.5,
      anchorY: 0.5,
      scaleX: 0.5 + rng() * 0.8,
      scaleY: 0.5 + rng() * 0.8,
      tint: TINTS[k % TINTS.length]!,
    });
    grains.addParticle(particle);
    list.push({ particle, x: Math.cos(a) * r, y: Math.sin(a) * r, delay: rng() * 0.5 * FALL_MS });
  }
  view.addChild(mound, grains);

  let age = 0;
  const draw = (): void => {
    // Le tas grossit à mesure que les grains tombent.
    const grow = Math.min(1, age / FALL_MS);
    mound.scale.set(0.2 + 0.8 * grow);
    mound.alpha = grow;
    for (const g of list) {
      const t = Math.max(0, Math.min(1, (age - g.delay) / (FALL_MS * 0.5)));
      // Chute accélérée, petit rebond à l'arrivée.
      const drop = (1 - t * t) * FALL_FROM - Math.sin(Math.min(1, t) * Math.PI) * 4 * t;
      g.particle.x = g.x;
      g.particle.y = g.y - drop;
      g.particle.alpha = t > 0 ? 1 : 0;
    }
    view.alpha = Math.min(1, Math.max(0, (SAND_FALL_MS - age) / FADE_MS));
  };
  draw();
  return {
    view,
    update: (dtMs) => {
      age += dtMs;
      draw();
      return age < SAND_FALL_MS;
    },
  };
}
