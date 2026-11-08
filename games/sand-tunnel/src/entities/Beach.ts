import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '@gambette/math-sdk';
import {
  CHANNEL_WIDTH,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  EXIT_RADIUS,
  POND_RADIUS,
  SCREENS,
  channelOf,
  exitOf,
  pondOf,
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

/** Objet du décor posé en (x, y), tourné de `rotation` radians. */
const placed = (g: Graphics, x: number, y: number, rotation: number): Graphics => {
  g.position.set(x, y);
  g.rotation = rotation;
  return g;
};

/** Coquillage Saint-Jacques vu du dessus, charnière vers le bas. */
function shell(color: number, size: number): Graphics {
  const g = new Graphics();
  const s = size / 26;
  g.moveTo(0, 0)
    .bezierCurveTo(-16 * s, -4 * s, -18 * s, -22 * s, 0, -26 * s)
    .bezierCurveTo(18 * s, -22 * s, 16 * s, -4 * s, 0, 0)
    .fill(color)
    .stroke({ width: 2.5, color: COLORS.shellLine, join: 'round' });
  for (const dx of [-8, 0, 8]) {
    g.moveTo(0, -2 * s).lineTo(dx * s, (dx === 0 ? -25 : -21) * s);
  }
  g.stroke({ width: 1.5, color: COLORS.shellLine });
  g.rect(-5 * s, -2 * s, 10 * s, 5 * s)
    .fill(color)
    .stroke({ width: 1.5, color: COLORS.shellLine });
  return g;
}

/** Petite pelle de plage : manche jaune, pelle rouge (le long de l'axe x). */
function shovel(): Graphics {
  const g = new Graphics();
  g.roundRect(-70, -6, 92, 12, 6)
    .fill(COLORS.shovelHandle)
    .stroke({ width: 2.5, color: COLORS.toyLine });
  g.roundRect(-86, -14, 22, 28, 10)
    .fill(COLORS.shovelHandle)
    .stroke({ width: 2.5, color: COLORS.toyLine });
  g.moveTo(18, -22)
    .lineTo(58, -26)
    .quadraticCurveTo(82, 0, 58, 26)
    .lineTo(18, 22)
    .closePath()
    .fill(COLORS.shovelBlade)
    .stroke({ width: 2.5, color: COLORS.toyLine, join: 'round' });
  g.moveTo(26, -10)
    .lineTo(56, -12)
    .stroke({ width: 3, color: 0xffffff, alpha: 0.45, cap: 'round' });
  return g;
}

/** Petit râteau de plage bleu : manche le long de l'axe x, peigne au bout. */
function rake(): Graphics {
  const g = new Graphics();
  g.roundRect(-90, -6, 120, 12, 6).fill(COLORS.rake).stroke({ width: 2.5, color: COLORS.toyLine });
  g.roundRect(28, -40, 14, 80, 5).fill(COLORS.rake).stroke({ width: 2.5, color: COLORS.toyLine });
  for (let i = 0; i < 6; i++) {
    const y = -34 + i * 13.6;
    g.roundRect(40, y - 3, 16, 6, 3)
      .fill(COLORS.rake)
      .stroke({ width: 2, color: COLORS.toyLine });
  }
  // Petits sillons laissés dans le sable derrière le peigne.
  for (let i = 0; i < 6; i++) {
    const y = -34 + i * 13.6;
    g.moveTo(62, y).lineTo(104, y);
  }
  g.stroke({ width: 2, color: COLORS.sandGrainDark, alpha: 0.6, cap: 'round' });
  return g;
}

/** Décor d'un écran, dans les coins laissés libres par la mare, la sortie et le réseau. */
const props = (k: number, h: number): Graphics[] => {
  const even = k % 2 === 0;
  const top = 46;
  const bottom = h - 34;
  return [
    placed(shell(COLORS.shell, 34), 60, even ? top : bottom, 0.4 + k),
    placed(shell(COLORS.shellAlt, 28), 140, even ? top + 10 : bottom - 4, -0.6),
    placed(shell(COLORS.shellAlt, 30), 660, even ? bottom : top + 10, 2.4 - k),
    k === 1
      ? placed(rake(), 600, top + 6, 0.08)
      : placed(shovel(), 520, bottom - 6, -0.1 + 0.2 * k),
  ];
};

/**
 * Décor fixe du monde, lu à la création (la hauteur dépend de l'écran) : trois écrans de sable côte à
 * côte, chacun avec sa mare et sa sortie, reliées d'un écran au suivant par un canal droit ; le
 * dernier canal file vers la mer (dessinée à part, animée).
 */
export function createBeach(): { readonly view: Container } {
  const view = new Container();
  view.label = 'beach';
  const worldWidth = SCREENS * DESIGN_WIDTH;
  const sand = new Graphics().rect(0, 0, worldWidth + 400, DESIGN_HEIGHT).fill(COLORS.sand);
  // Grains toujours au même endroit d'une partie à l'autre.
  const rng = mulberry32(7);
  for (let i = 0; i < 420 * SCREENS; i++) {
    sand
      .circle(rng() * worldWidth, rng() * DESIGN_HEIGHT, 1 + rng() * 1.6)
      .fill({ color: rng() > 0.5 ? COLORS.sandGrainDark : COLORS.sandGrainLight, alpha: 0.55 });
  }
  const decor = new Container();
  decor.label = 'props';
  for (let k = 0; k < SCREENS; k++) {
    for (const g of props(k, DESIGN_HEIGHT)) {
      g.x += k * DESIGN_WIDTH;
      decor.addChild(g);
    }
  }

  const ground = new Graphics();
  const ponds = Array.from({ length: SCREENS }, (_, k) => pondOf(k));
  const exits = Array.from({ length: SCREENS }, (_, k) => exitOf(k));
  const channels = Array.from({ length: SCREENS }, (_, k) => channelOf(k));
  // Bourrelets de sable, puis les creux : mares, sorties et lits des canaux, sans trait aux raccords.
  for (const p of ponds) ground.poly(wobblyCircle(p.x, p.y, POND_RADIUS + 20, 5)).fill(COLORS.rim);
  for (const e of exits) ground.circle(e.x, e.y, EXIT_RADIUS + 12).fill(COLORS.rim);
  for (const [a, b] of channels) {
    ground
      .moveTo(a!.x, a!.y)
      .lineTo(b!.x, b!.y)
      .stroke({ width: CHANNEL_WIDTH + 16, color: COLORS.rim, cap: 'round' });
  }
  for (const [a, b] of channels) {
    ground
      .moveTo(a!.x, a!.y)
      .lineTo(b!.x, b!.y)
      .stroke({ width: CHANNEL_WIDTH + 6, color: COLORS.pitLine, cap: 'round' });
  }
  for (const p of ponds) {
    ground
      .poly(wobblyCircle(p.x, p.y, POND_RADIUS, 4))
      .fill(COLORS.pit)
      .stroke({ width: 3, color: COLORS.pitLine });
  }
  for (const e of exits) {
    ground.circle(e.x, e.y, EXIT_RADIUS).fill(COLORS.pitDeep).stroke({
      width: 3,
      color: COLORS.pitLine,
    });
  }
  for (const [a, b] of channels) {
    ground
      .moveTo(a!.x, a!.y)
      .lineTo(b!.x, b!.y)
      .stroke({ width: CHANNEL_WIDTH, color: COLORS.pit, cap: 'round' });
  }
  for (const p of ponds) {
    for (const s of [0.72, 0.46]) {
      ground
        .poly(wobblyCircle(p.x, p.y, POND_RADIUS * s, 3))
        .fill({ color: COLORS.pitDeep, alpha: 0.18 })
        .stroke({ width: 2, color: COLORS.pitLine, alpha: 0.25 });
    }
  }
  view.addChild(sand, decor, ground);
  return { view };
}
