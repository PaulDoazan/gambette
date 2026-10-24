import { Container, Graphics } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/dimensions';
import { ROUNDS } from '../config/rounds';
import { COLORS } from '../config/theme';
import { SEA_SHORE_X } from '../domain/channel';

/** La mer déborde du monde à droite : on ne voit jamais son bord. */
const OVERRUN = 400;
/** Durée d'un aller-retour de l'écume sur le sable (ms). */
const SWASH_MS = 2600;

/** Rivage ondulé à la hauteur `y`, avancé de `reach` px sur le sable. */
const shoreX = (y: number, reach: number): number =>
  SEA_SHORE_X() - reach + Math.sin(y / 70) * 10 + Math.sin(y / 23 + 1) * 4;

/**
 * La mer, au bord droit du dernier écran : eau pleine, rivage ondulé où l'écume va et vient, et
 * quelques vagues qui roulent vers la plage.
 */
export function createSea(): { readonly view: Container; update(dtMs: number): void } {
  const view = new Container();
  view.label = 'sea';
  const g = new Graphics();
  view.addChild(g);
  const right = ROUNDS.length * DESIGN_WIDTH + OVERRUN;
  let clock = 0;

  const draw = (): void => {
    g.clear();
    const swash = (Math.sin((clock / SWASH_MS) * Math.PI * 2) + 1) / 2;
    const reach = 4 + swash * 14;
    const edge = (r: number): number[] => {
      const pts: number[] = [];
      for (let y = -20; y <= DESIGN_HEIGHT + 20; y += 16) pts.push(shoreX(y, r), y);
      return pts;
    };
    // Sable mouillé laissé par la dernière vague, puis la mer.
    g.poly([...edge(22), right, DESIGN_HEIGHT + 20, right, -20]).fill({
      color: COLORS.wetSand,
      alpha: 0.35,
    });
    g.poly([...edge(reach), right, DESIGN_HEIGHT + 20, right, -20])
      .fill(COLORS.water)
      .stroke({ width: 3, color: COLORS.waterEdge });
    // Liseré d'écume au bord de l'eau.
    const foam = edge(reach);
    g.moveTo(foam[0]! + 8, foam[1]!);
    for (let i = 2; i < foam.length; i += 2) g.lineTo(foam[i]! + 8, foam[i + 1]!);
    g.stroke({ width: 5, color: COLORS.foam, alpha: 0.8, cap: 'round', join: 'round' });
    // Vagues : de petites crêtes qui avancent vers le rivage.
    for (let i = 0; i < 9; i++) {
      const y = 60 + ((i * 197) % (DESIGN_HEIGHT - 120));
      const phase = (clock / 3200 + i * 0.37) % 1;
      const x = SEA_SHORE_X() + 150 - phase * 110;
      g.moveTo(x - 4, y - 18)
        .quadraticCurveTo(x - 16, y, x - 4, y + 18)
        .stroke({
          width: 4,
          color: COLORS.foam,
          alpha: 0.75 * Math.sin(phase * Math.PI),
          cap: 'round',
        });
    }
  };
  draw();

  return {
    view,
    update: (dtMs) => {
      clock += dtMs;
      draw();
    },
  };
}
