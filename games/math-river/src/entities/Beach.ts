import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '@gambette/math-sdk';
import { DESIGN_HEIGHT, DESIGN_WIDTH, MID_Y } from '../config/dimensions';
import { ROUNDS, holeCenterOf } from '../config/rounds';
import { COLORS } from '../config/theme';
import { channelFrom } from '../domain/channel';

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

/** Décor propre à chaque écran : cailloux et objets, hors des trous, canaux, seaux et calculs. */
const SCREENS: ReadonlyArray<{
  pebbles: ReadonlyArray<readonly [number, number, number]>;
  props: (cy: number) => Graphics[];
}> = [
  {
    pebbles: [
      [620, -170, 10],
      [95, 180, 8],
      [640, 250, 7],
      [120, -210, 9],
    ],
    props: (cy) => [
      placed(shell(COLORS.shell, 40), 640, cy - 120, 0.4),
      placed(shell(COLORS.shellAlt, 34), 64, cy - 300, -0.5),
      placed(shell(COLORS.shell, 30), 300, cy + 255, 2.6),
      placed(shell(COLORS.shellAlt, 36), 660, cy + 160, -2.2),
      placed(shell(COLORS.shell, 28), 440, cy - 300, 1.2),
      placed(shell(COLORS.shellAlt, 32), 46, cy + 340, 0.9),
      placed(shovel(), 580, cy - 260, -0.55),
      placed(rake(), 180, cy + 290, 0.3),
    ],
  },
  {
    pebbles: [
      [660, -230, 9],
      [70, 230, 8],
      [600, 260, 7],
    ],
    props: (cy) => [
      placed(shell(COLORS.shellAlt, 38), 640, cy - 300, -0.7),
      placed(shell(COLORS.shell, 30), 380, cy - 300, 0.5),
      placed(shell(COLORS.shell, 34), 60, cy + 300, 2.2),
      placed(shell(COLORS.shellAlt, 28), 680, cy + 200, 1.4),
      placed(shovel(), 250, cy + 305, 0.35),
    ],
  },
  {
    pebbles: [
      [80, -260, 9],
      [560, 270, 8],
    ],
    props: (cy) => [
      placed(shell(COLORS.shell, 36), 560, cy - 300, 0.9),
      placed(shell(COLORS.shellAlt, 30), 120, cy + 300, -1.1),
      placed(shell(COLORS.shell, 32), 330, cy + 290, 2.8),
      placed(rake(), 400, cy - 300, -0.15),
    ],
  },
];

/**
 * Décor fixe du monde, lu à la création (la hauteur dépend de l'écran) : trois écrans de sable côte à
 * côte, chacun avec son trou en cuvette (de plus en plus grand), reliés par des canaux sinueux ; le
 * dernier canal file vers la mer (dessinée à part, animée).
 */
export function createBeach(): { readonly view: Container } {
  const view = new Container();
  view.label = 'beach';
  const cy = MID_Y;
  const worldWidth = ROUNDS.length * DESIGN_WIDTH;

  const sand = new Graphics().rect(0, 0, worldWidth, DESIGN_HEIGHT).fill(COLORS.sand);
  // Grains toujours au même endroit d'une partie à l'autre.
  const rng = mulberry32(7);
  for (let i = 0; i < 420 * ROUNDS.length; i++) {
    sand
      .circle(rng() * worldWidth, rng() * DESIGN_HEIGHT, 1 + rng() * 1.6)
      .fill({ color: rng() > 0.5 ? COLORS.sandGrainDark : COLORS.sandGrainLight, alpha: 0.55 });
  }
  const props = new Container();
  props.label = 'props';
  SCREENS.forEach((screen, k) => {
    const ox = k * DESIGN_WIDTH;
    for (const [x, dy, r] of screen.pebbles) {
      sand
        .ellipse(ox + x, cy + dy, r, r * 0.7)
        .fill(0xd9d2c3)
        .stroke({ width: 1.5, color: COLORS.pitLine });
    }
    for (const g of screen.props(cy)) {
      g.x += ox;
      props.addChild(g);
    }
  });

  const ground = new Graphics();
  const holes = ROUNDS.map((r, k) => ({ c: holeCenterOf(k), r: r.holeRadius }));
  const channels = ROUNDS.map((_, k) => channelFrom(k));
  // Bourrelets de sable des trous et des canaux, d'un seul tenant.
  for (const h of holes) ground.poly(wobblyCircle(h.c.x, h.c.y, h.r + 22, 5)).fill(COLORS.rim);
  for (const ch of channels) ground.poly(ch.outline(8)).fill(COLORS.rim);
  // Cuvettes, puis le lit des canaux par-dessus leur contour : les raccords n'ont pas de trait.
  for (const h of holes) {
    ground
      .poly(wobblyCircle(h.c.x, h.c.y, h.r, 4))
      .fill(COLORS.pit)
      .stroke({ width: 3, color: COLORS.pitLine });
  }
  for (const ch of channels) ground.poly(ch.outline(0)).fill(COLORS.pit);
  // Berges des canaux, seulement hors des trous : elles prolongent le bord des cuvettes.
  const inAHole = (x: number, y: number): boolean =>
    holes.some((h) => Math.hypot(x - h.c.x, y - h.c.y) < h.r);
  for (const ch of channels) {
    for (const side of [1, -1] as const) {
      const bank = ch.bank(side);
      let started = false;
      for (let i = 0; i < bank.length; i += 2) {
        const x = bank[i]!;
        const y = bank[i + 1]!;
        if (inAHole(x, y)) {
          started = false;
          continue;
        }
        if (started) ground.lineTo(x, y);
        else ground.moveTo(x, y);
        started = true;
      }
    }
  }
  ground.stroke({ width: 3, color: COLORS.pitLine, cap: 'round', join: 'round' });
  for (const h of holes) {
    for (const k of [0.78, 0.56, 0.34]) {
      ground
        .poly(wobblyCircle(h.c.x, h.c.y, h.r * k, 3))
        .fill({ color: COLORS.pitDeep, alpha: 0.18 })
        .stroke({ width: 2, color: COLORS.pitLine, alpha: 0.25 });
    }
  }
  view.addChild(sand, props, ground);
  return { view };
}
