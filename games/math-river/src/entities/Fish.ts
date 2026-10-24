import { Container, Graphics } from 'pixi.js';
import { LAST_ROUND, PAN_MS, holeCenterOf } from '../config/rounds';
import { STRUGGLE_LEVEL } from '../config/water';
import { COLORS } from '../config/theme';
import { channelFrom, type Channel } from '../domain/channel';
import type { Vec } from '../domain/types';

/** Entrée du canal, au bord du trou. */
const GATE_T = 0.12;
/** Distance parcourue dans la mer au bout du dernier canal (px) : il y reste visible. */
const SEA_SWIM = 10;
/** Temps (ms) pour que le poisson arrivé au centre d'un trou reprenne sa ronde. */
const SETTLE_MS = 700;

export interface Fish {
  readonly view: Container;
  position(): Vec;
  isStruggling(): boolean;
  /** Nage en rond dans le trou k (coordonnées du monde). */
  swimIn(k: number): void;
  /**
   * Quitte le trou k par son canal et gagne le trou suivant (ou la mer, depuis le dernier) en
   * PAN_MS ; `onOut` une fois arrivé, et il nage alors dans le trou suivant.
   */
  escape(k: number, onOut: () => void): void;
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

  let home = holeCenterOf(0);
  let angle = 0;
  let clock = 0;
  let settle = 1;
  let struggling = true;
  let escape: {
    elapsed: number;
    from: Vec;
    channel: Channel;
    /** Point d'arrivée au bout du canal : centre du trou suivant, ou large dans la mer. */
    to: Vec;
    next: number | null;
    onOut: () => void;
    done: boolean;
  } | null = null;

  const place = (p: Vec, heading: number, wiggle: number): void => {
    body.position.set(p.x, p.y);
    body.rotation = heading + Math.PI + wiggle;
  };
  const lerp = (a: Vec, b: Vec, u: number): Vec => ({
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
  });
  const swimIn = (k: number): void => {
    home = holeCenterOf(k);
    escape = null;
    angle = Math.PI;
    settle = 1;
  };

  return {
    view,
    position: () => ({ x: body.x, y: body.y }),
    isStruggling: () => struggling,
    swimIn,
    escape: (k, onOut) => {
      if (escape) return;
      const channel = channelFrom(k);
      const end = channel.center(1);
      const next = k < LAST_ROUND ? k + 1 : null;
      const to = next === null ? { x: end.x + SEA_SWIM, y: end.y } : holeCenterOf(next);
      escape = {
        elapsed: 0,
        from: { x: body.x, y: body.y },
        channel,
        to,
        next,
        onOut,
        done: false,
      };
    },
    update: (dtMs, level, waterR) => {
      clock += dtMs;
      splashes.clear();
      if (escape && !escape.done) {
        // Vers l'entrée du canal, puis le long de ses méandres, enfin jusqu'au trou suivant.
        escape.elapsed += dtMs;
        const t = Math.min(1, escape.elapsed / PAN_MS);
        const { channel } = escape;
        const gate = channel.center(GATE_T);
        const end = channel.center(1);
        const wiggle = Math.sin(clock / 70) * 0.12;
        if (t < 0.25) {
          const u = t / 0.25;
          place(
            lerp(escape.from, gate, u),
            Math.atan2(gate.y - escape.from.y, gate.x - escape.from.x),
            wiggle,
          );
        } else if (t < 0.75) {
          const s = GATE_T + ((t - 0.25) / 0.5) * (1 - GATE_T);
          place(channel.center(s), channel.heading(s), wiggle);
        } else {
          const u = (t - 0.75) / 0.25;
          place(
            lerp(end, escape.to, u),
            Math.atan2(escape.to.y - end.y, escape.to.x - end.x),
            wiggle,
          );
        }
        if (t >= 1) {
          escape.done = true;
          const { next, onOut } = escape;
          if (next !== null) {
            swimIn(next);
            settle = 0;
          }
          onOut();
        }
        return;
      }
      if (escape) return; // dans la mer : il est parti
      struggling = level < STRUGGLE_LEVEL;
      // Nage en rond dans l'eau ; plus vite et en se tortillant quand il manque d'eau.
      settle = Math.min(1, settle + dtMs / SETTLE_MS);
      const orbit = Math.max(4, waterR * 0.45) * settle;
      angle += (dtMs / 1000) * (struggling ? 2.4 : 0.9);
      const p = { x: home.x + Math.cos(angle) * orbit, y: home.y + Math.sin(angle) * orbit };
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
      swimIn(0);
      angle = 0;
      struggling = true;
    },
  };
}
