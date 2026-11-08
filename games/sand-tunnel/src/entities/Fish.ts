import { Container, Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';
import { headingAt, pointAt, routeLength } from '../domain/route';
import type { Vec } from '../domain/types';

/** Rayon de la ronde du poisson dans sa mare. */
const ORBIT = 34;
/** Temps (ms) pour que le poisson arrivé dans une mare reprenne sa ronde. */
const SETTLE_MS = 700;
/** Taille du poisson : plus petit que celui de Math River, pour passer dans les galeries. */
const SCALE = 0.8;

export interface Fish {
  readonly view: Container;
  /** Ombre du poisson sur le fond, sous l'eau. */
  readonly shadow: Container;
  position(): Vec;
  /** Nage en rond dans la mare centrée en `home`. */
  swimIn(home: Vec): void;
  /** Suit le chemin `route` en `durationMs`, puis `onDone` (il reste au bout). */
  follow(route: readonly Vec[], durationMs: number, onDone: () => void): void;
  /** En route le long d'un chemin. */
  travelling(): boolean;
  update(dtMs: number): void;
}

/** Poisson dessiné tête vers la gauche (−x) : sa rotation suit sa direction de nage + π. */
function drawTail(g: Graphics): void {
  g.poly([0, 0, 18, -14, 14, 0, 18, 14])
    .fill(COLORS.fishFin)
    .stroke({ width: 2.5, color: COLORS.fishLine, join: 'round' });
}

function drawFish(g: Graphics): void {
  g.ellipse(0, 0, 28, 15).fill(COLORS.fish).stroke({ width: 2.5, color: COLORS.fishLine });
  g.moveTo(-4, -14)
    .quadraticCurveTo(6, -24, 14, -12)
    .fill(COLORS.fishFin)
    .stroke({ width: 2, color: COLORS.fishLine });
  g.moveTo(6, -12).quadraticCurveTo(2, 0, 6, 12).stroke({ width: 2, color: COLORS.fishLine });
  g.circle(-15, -4, 4.5).fill(0xffffff).stroke({ width: 1.5, color: COLORS.fishLine });
  g.circle(-16, -4, 2.2).fill(0x111111);
}

/** Le poisson de Math River : il tourne dans sa mare, puis file le long d'une galerie. */
export function createFish(home0: Vec): Fish {
  const view = new Container();
  view.label = 'fish';
  const body = new Container();
  body.scale.set(SCALE);
  const tail = new Graphics();
  drawTail(tail);
  tail.x = 22;
  const torso = new Graphics();
  drawFish(torso);
  body.addChild(tail, torso);
  view.addChild(body);
  const shadow = new Container();
  const shade = new Graphics().ellipse(0, 0, 28, 11).fill({ color: 0x0b2f44, alpha: 0.35 });
  shadow.addChild(shade);

  let home = home0;
  let angle = 0;
  let clock = 0;
  let settle = 1;
  let trip: {
    route: readonly Vec[];
    length: number;
    elapsed: number;
    duration: number;
    onDone: () => void;
  } | null = null;

  const place = (p: Vec, heading: number, wiggle: number, beat: number): void => {
    body.position.set(p.x, p.y);
    body.rotation = heading + Math.PI + wiggle;
    // L'ombre tombe un peu plus loin sur le fond, comme sous une eau éclairée d'en haut.
    shade.position.set(p.x + 8, p.y + 13);
    shade.rotation = body.rotation;
    tail.rotation = Math.sin(clock / beat) * 0.45;
  };

  const swimIn = (p: Vec): void => {
    home = p;
    trip = null;
    settle = 0;
  };

  const fish: Fish = {
    view,
    shadow,
    position: () => ({ x: body.x, y: body.y }),
    swimIn,
    follow: (route, duration, onDone) => {
      const start = { x: body.x, y: body.y };
      const full = [start, ...route];
      trip = { route: full, length: routeLength(full), elapsed: 0, duration, onDone };
    },
    travelling: () => trip !== null,
    update: (dtMs) => {
      clock += dtMs;
      if (trip) {
        trip.elapsed += dtMs;
        const t = Math.min(1, trip.elapsed / trip.duration);
        // Départ vif, arrivée en douceur.
        const s = (1 - (1 - t) ** 2) * trip.length;
        place(pointAt(trip.route, s), headingAt(trip.route, s), Math.sin(clock / 70) * 0.12, 60);
        if (t >= 1) {
          // Arrivé : il reprend sa ronde là où le chemin l'a mené (mare suivante ou mer).
          const { onDone, route } = trip;
          trip = null;
          home = route[route.length - 1]!;
          settle = 0;
          onDone();
        }
        return;
      }
      // Ronde tranquille dans la mare ; après un voyage, il rejoint sa ronde en douceur.
      settle = Math.min(1, settle + dtMs / SETTLE_MS);
      angle += (dtMs / 1000) * 0.9;
      const orbit = ORBIT * settle;
      const p = { x: home.x + Math.cos(angle) * orbit, y: home.y + Math.sin(angle) * orbit };
      place(p, angle + Math.PI / 2, Math.sin(clock / 160) * 0.15, 140);
    },
  };
  fish.update(0);
  return fish;
}
