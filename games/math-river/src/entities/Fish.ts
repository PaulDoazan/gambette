import { Container, Graphics } from 'pixi.js';
import { DESIGN_WIDTH, MID_Y } from '../config/dimensions';
import { ESCAPE_MS, STRUGGLE_LEVEL } from '../config/water';
import { COLORS } from '../config/theme';
import { channelCenter, channelHeading } from '../domain/channel';
import type { Vec } from '../domain/types';

/** Entrée du canal (au bord du trou) et point de sortie, au-delà du bord droit. */
const GATE_T = 0.12;
const OUT_T = 1.4;

export interface Fish {
  readonly view: Container;
  position(): Vec;
  isStruggling(): boolean;
  /** Commence l'évasion par le canal ; `onOut` quand le poisson a quitté l'écran. */
  escape(onOut: () => void): void;
  /** `waterR` : rayon de la surface de l'eau, `level` : niveau lissé. */
  update(dtMs: number, level: number, waterR: number): void;
  reset(): void;
}

/** Poisson dessiné tête vers la gauche (−x) : sa rotation suit sa direction de nage + π. */
function drawFish(g: Graphics): void {
  g.poly([22, 0, 40, -14, 36, 0, 40, 14])
    .fill(COLORS.fishFin)
    .stroke({ width: 2.5, color: COLORS.fishLine, join: 'round' });
  g.ellipse(0, 0, 28, 15).fill(COLORS.fish).stroke({ width: 2.5, color: COLORS.fishLine });
  g.moveTo(-4, -14)
    .quadraticCurveTo(6, -24, 14, -12)
    .fill(COLORS.fishFin)
    .stroke({ width: 2, color: COLORS.fishLine });
  g.moveTo(6, -12).quadraticCurveTo(2, 0, 6, 12).stroke({ width: 2, color: COLORS.fishLine });
  g.circle(-15, -4, 4.5).fill(0xffffff).stroke({ width: 1.5, color: COLORS.fishLine });
  g.circle(-16, -4, 2.2).fill(0x111111);
}

export function createFish(): Fish {
  const view = new Container();
  view.label = 'fish';
  const body = new Graphics();
  drawFish(body);
  const splashes = new Graphics();
  view.addChild(splashes, body);

  const cx = DESIGN_WIDTH / 2;
  const cy = MID_Y;
  let angle = 0;
  let clock = 0;
  let struggling = true;
  let escape: { elapsed: number; from: Vec; onOut: () => void; done: boolean } | null = null;

  const place = (p: Vec, heading: number, wiggle: number): void => {
    body.position.set(p.x, p.y);
    body.rotation = heading + Math.PI + wiggle;
  };

  return {
    view,
    position: () => ({ x: body.x, y: body.y }),
    isStruggling: () => struggling,
    escape: (onOut) => {
      escape ??= { elapsed: 0, from: { x: body.x, y: body.y }, onOut, done: false };
    },
    update: (dtMs, level, waterR) => {
      clock += dtMs;
      splashes.clear();
      if (escape) {
        // Vers l'entrée du canal (premier tiers), puis le long de ses méandres jusqu'au-delà du
        // bord droit.
        escape.elapsed += dtMs;
        const t = Math.min(1, escape.elapsed / ESCAPE_MS);
        const gate = channelCenter(GATE_T);
        const wiggle = Math.sin(clock / 70) * 0.12;
        if (t < 1 / 3) {
          const u = t * 3;
          const p = {
            x: escape.from.x + (gate.x - escape.from.x) * u,
            y: escape.from.y + (gate.y - escape.from.y) * u,
          };
          place(p, Math.atan2(gate.y - escape.from.y, gate.x - escape.from.x), wiggle);
        } else {
          const s = GATE_T + (t - 1 / 3) * 1.5 * (OUT_T - GATE_T);
          if (s <= 1) place(channelCenter(s), channelHeading(s), wiggle);
          else place({ x: DESIGN_WIDTH + (s - 1) * 200, y: channelCenter(1).y }, 0, wiggle);
        }
        if (t >= 1 && !escape.done) {
          escape.done = true;
          escape.onOut();
        }
        return;
      }
      struggling = level < STRUGGLE_LEVEL;
      // Nage en rond dans l'eau ; plus vite et en se tortillant quand il manque d'eau.
      const orbit = Math.max(4, waterR * 0.45);
      angle += (dtMs / 1000) * (struggling ? 2.4 : 0.9);
      const p = { x: cx + Math.cos(angle) * orbit, y: cy + Math.sin(angle) * orbit };
      const wiggle = Math.sin(clock / (struggling ? 45 : 160)) * (struggling ? 0.5 : 0.15);
      place(p, angle + Math.PI / 2, wiggle);
      if (struggling) {
        for (const [dx, dy, r] of [
          [-42, -20, 5],
          [40, -24, 4],
          [-36, 24, 4],
          [46, 16, 5],
        ] as const) {
          const k = 0.6 + 0.4 * Math.sin(clock / 90 + dx);
          splashes
            .circle(p.x + dx * k, p.y + dy * k, r)
            .fill({ color: COLORS.waterLight, alpha: 0.9 })
            .stroke({ width: 1.5, color: COLORS.waterEdge });
        }
      }
    },
    reset: () => {
      escape = null;
      angle = 0;
      struggling = true;
    },
  };
}
