import { Container, DisplacementFilter, Sprite, Texture, type Filter } from 'pixi.js';
import { ShockwaveFilter } from 'pixi-filters';
import type { Vec } from '../domain/types';

/** Côté des textures générées (px) : elles se répètent sans couture. */
const TILE = 256;

/** Texture dessinée pixel par pixel dans un canvas, répétée à l'infini. */
function canvasTexture(paint: (x: number, y: number) => [number, number, number, number]): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE; // pas de canvas (tests) : texture neutre
  const img = ctx.createImageData(TILE, TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const i = (y * TILE + x) * 4;
      const [r, g, b, a] = paint(x, y);
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(canvas);
  tex.source.addressMode = 'repeat';
  return tex;
}

/** Somme d'ondes de fréquences entières : périodique sur TILE, donc sans couture. */
const waves = (x: number, y: number, list: readonly (readonly [number, number, number])[]) =>
  list.reduce((s, [fx, fy, ph]) => s + Math.sin(((fx * x + fy * y) / TILE) * Math.PI * 2 + ph), 0) /
  list.length;

/** Bruit doux : rouge = décalage horizontal, vert = vertical (lu par le DisplacementFilter). */
export const makeDisplacementTexture = (): Texture =>
  canvasTexture((x, y) => {
    const dx = waves(x, y, [
      [2, 1, 0.3],
      [3, -2, 1.7],
      [1, 4, 4.1],
    ]);
    const dy = waves(x, y, [
      [1, 3, 2.2],
      [-3, 2, 0.6],
      [4, 1, 5.3],
    ]);
    return [128 + dx * 127, 128 + dy * 127, 128, 255];
  });

/** Reflets de soleil au fond de l'eau : un réseau de lignes claires, blanc sur transparent. */
export const makeCausticsTexture = (): Texture =>
  canvasTexture((x, y) => {
    const a = waves(x, y, [
      [3, 1, 0],
      [-1, 3, 1.3],
      [2, -3, 2.9],
    ]);
    const b = waves(x, y, [
      [-2, 3, 0.7],
      [3, 2, 2.1],
      [1, -4, 4.4],
    ]);
    const line = (v: number): number => Math.pow(1 - Math.abs(v), 24);
    const c = Math.min(1, line(a) + line(b));
    return [255, 255, 255, Math.round(c * 255)];
  });

/**
 * Onde de choc réglée comme dans pixijs-elementals : son horloge avance de 0,015 par image (à
 * 60 images/s, 0,9 par seconde) et elle vit jusqu'à 4.
 */
const SHOCK_CLOCK_PER_S = 0.9;
const SHOCK_LIFE = 4;

export interface WaterFx {
  /** Eau qui ondule : déformation de tout ce qui est dans `target`. */
  update(dtMs: number): void;
  /** Onde de choc là où l'eau d'un seau tombe (coordonnées de `target`), sur tout le décor. */
  splash(at: Vec): void;
}

/**
 * Effets de l'eau, à la façon de pixijs-elementals : une carte de déplacement qui défile (l'eau
 * ondule et déforme le fond et le poisson), et des ondes de choc aux impacts.
 */
export function createWaterFx(target: Container, shockTarget: Container): WaterFx {
  const map = new Sprite(makeDisplacementTexture());
  map.renderable = false; // ne sert qu'au filtre
  map.scale.set(2);
  target.addChild(map);
  const displacement = new DisplacementFilter({ sprite: map, scale: 14 });
  let shocks: ShockwaveFilter[] = [];
  target.filters = [displacement];
  // Ondes de choc sur tout le décor, comme pixijs-elementals les met sur toute la scène.
  const apply = (): void => {
    shockTarget.filters = shocks.length ? (shocks as Filter[]) : null;
  };
  apply();
  let clock = 0;
  return {
    update: (dtMs) => {
      clock += dtMs;
      map.x = (clock * 0.02) % (TILE * 2);
      map.y = (clock * 0.014) % (TILE * 2);
      for (const s of shocks) s.time += (dtMs / 1000) * SHOCK_CLOCK_PER_S;
      const alive = shocks.filter((s) => s.time < SHOCK_LIFE);
      if (alive.length !== shocks.length) {
        shocks.filter((s) => s.time >= SHOCK_LIFE).forEach((s) => s.destroy());
        shocks = alive;
        apply();
      }
    },
    splash: (at) => {
      if (shocks.length >= 10) return; // comme pixijs-elementals
      // Le filtre travaille en pixels de l'écran.
      const g = target.toGlobal(at);
      shocks.push(
        new ShockwaveFilter({
          center: { x: g.x, y: g.y },
          amplitude: 30,
          wavelength: 160,
          brightness: 1,
          radius: -1,
          time: 0,
        }),
      );
      apply();
    },
  };
}
