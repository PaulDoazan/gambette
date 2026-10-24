import { Container, Graphics } from 'pixi.js';
import { mulberry32 } from '@gambette/math-sdk';
import { DESIGN_HEIGHT, DESIGN_WIDTH, HOLE_RADIUS, MID_Y } from '../config/dimensions';
import { COLORS } from '../config/theme';
import { channelBank, channelOutline } from '../domain/channel';

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

/**
 * Décor fixe, lu à la création (la hauteur dépend de l'écran) : sable semé de grains, cailloux,
 * coquillages, pelle et râteau, trou en cuvette au centre et canal sinueux jusqu'au bord droit.
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
    [640, cy + 250, 7],
    [120, cy - 210, 9],
  ] as const) {
    sand
      .ellipse(x, y, r, r * 0.7)
      .fill(0xd9d2c3)
      .stroke({ width: 1.5, color: COLORS.pitLine });
  }

  // Coquillages, pelle et râteau : hors du trou, du canal, des seaux et des blocs de calcul.
  const props = new Container();
  props.label = 'props';
  props.addChild(
    placed(shell(COLORS.shell, 40), 640, cy - 120, 0.4),
    placed(shell(COLORS.shellAlt, 34), 64, cy - 300, -0.5),
    placed(shell(COLORS.shell, 30), 300, cy + 255, 2.6),
    placed(shell(COLORS.shellAlt, 36), 660, cy + 160, -2.2),
    placed(shell(COLORS.shell, 28), 440, cy - 300, 1.2),
    placed(shell(COLORS.shellAlt, 32), 46, cy + 340, 0.9),
    placed(shovel(), 580, cy - 260, -0.55),
    placed(rake(), 180, cy + 290, 0.3),
  );

  const ground = new Graphics();
  // Bourrelets de sable du trou et du canal, d'un seul tenant.
  ground.poly(wobblyCircle(cx, cy, HOLE_RADIUS + 22, 5)).fill(COLORS.rim);
  ground.poly(channelOutline(8)).fill(COLORS.rim);
  // Cuvette, puis le lit du canal par-dessus son contour : le raccord n'a pas de trait.
  ground
    .poly(wobblyCircle(cx, cy, HOLE_RADIUS, 4))
    .fill(COLORS.pit)
    .stroke({ width: 3, color: COLORS.pitLine });
  ground.poly(channelOutline(0)).fill(COLORS.pit);
  // Berges du canal, seulement hors du trou : elles prolongent le bord de la cuvette.
  for (const side of [1, -1] as const) {
    const bank = channelBank(side);
    let started = false;
    for (let i = 0; i < bank.length; i += 2) {
      const x = bank[i]!;
      const y = bank[i + 1]!;
      if (Math.hypot(x - cx, y - cy) < HOLE_RADIUS) continue;
      if (started) ground.lineTo(x, y);
      else ground.moveTo(x, y);
      started = true;
    }
  }
  ground.stroke({ width: 3, color: COLORS.pitLine, cap: 'round', join: 'round' });
  for (const k of [0.78, 0.56, 0.34]) {
    ground
      .poly(wobblyCircle(cx, cy, HOLE_RADIUS * k, 3))
      .fill({ color: COLORS.pitDeep, alpha: 0.18 })
      .stroke({ width: 2, color: COLORS.pitLine, alpha: 0.25 });
  }
  view.addChild(sand, props, ground);
  return { view };
}
