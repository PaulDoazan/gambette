import { HIT_RADIUS, POND_RADIUS, TRACK_MARGIN } from '../config/dimensions';
import { POND, isLinked, type Network } from './network';
import { dist } from './route';
import type { Vec } from './types';

/** Verdict d'une galerie au lever du doigt. */
export type Verdict =
  | { kind: 'incomplete' }
  | { kind: 'correct' }
  /** `wrong` : places (0 à 2) des galets qui ne sont pas ceux du bon chemin. */
  | { kind: 'wrong'; wrong: number[] };

export interface Dig {
  /** Le doigt se pose : il doit partir de la mare, ou d'un nombre de départ. */
  begin(p: Vec): boolean;
  /** Le doigt glisse : il creuse vers un galet relié, ou revient sur le précédent. */
  move(p: Vec): void;
  /** Le doigt se lève : la galerie creusée, puis on repart de zéro. */
  end(): number[];
  active(): boolean;
  path(): readonly number[];
  /** Position du doigt pendant le geste. */
  finger(): Vec | null;
  /**
   * Bout de galerie entre le dernier galet creusé et le doigt, le long du sillon le plus proche du
   * doigt (vers un galet relié, ou en arrière vers le précédent). Null si le doigt s'écarte de plus
   * de TRACK_MARGIN de tous ces sillons : la galerie s'arrête alors au dernier galet.
   */
  lead(): Lead | null;
}

/** Bout de galerie : vers `toward` (un id, ou POND en arrière), sur `len` depuis le dernier galet. */
export interface Lead {
  readonly toward: number;
  readonly len: number;
}

const nodeAt = (net: Network, p: Vec): number => {
  let best = -1;
  let bestD = HIT_RADIUS;
  for (const n of net.nodes) {
    const d = dist(n.pos, p);
    if (d <= bestD) {
      best = n.id;
      bestD = d;
    }
  }
  return best;
};

/** Point de `net` : la mare, ou un galet. */
export const posOf = (net: Network, id: number): Vec =>
  id === POND ? net.pond : net.nodes[id]!.pos;

/** Geste de creusage sur le réseau `net` : nombre, opérateur, nombre, en suivant les sillons. */
export function createDig(net: Network): Dig {
  let path: number[] = [];
  let finger: Vec | null = null;

  const tip = (): number => (path.length > 0 ? path[path.length - 1]! : POND);
  const previous = (): number => (path.length >= 2 ? path[path.length - 2]! : POND);
  const inPond = (p: Vec): boolean => dist(p, net.pond) <= POND_RADIUS;

  /** Sillons depuis le dernier galet : vers l'avant (galets reliés), et le retour au précédent. */
  const lead = (): Lead | null => {
    if (!finger) return null;
    const from = posOf(net, tip());
    const towards =
      path.length < 3
        ? net.nodes.map((n) => n.id).filter((id) => isLinked(net, tip(), id) && !path.includes(id))
        : [];
    if (path.length > 0) towards.push(previous());
    let best: Lead | null = null;
    let bestD = TRACK_MARGIN;
    for (const toward of towards) {
      const to = posOf(net, toward);
      const len = dist(from, to);
      if (len === 0) continue;
      const ux = (to.x - from.x) / len;
      const uy = (to.y - from.y) / len;
      const along = Math.min(len, Math.max(0, (finger.x - from.x) * ux + (finger.y - from.y) * uy));
      const d = dist(finger, { x: from.x + ux * along, y: from.y + uy * along });
      if (d <= bestD) {
        bestD = d;
        best = { toward, len: along };
      }
    }
    return best;
  };

  return {
    begin: (p) => {
      path = [];
      if (inPond(p)) {
        finger = p;
        return true;
      }
      const id = nodeAt(net, p);
      if (id >= 0 && isLinked(net, POND, id)) {
        path = [id];
        finger = p;
        return true;
      }
      return false;
    },
    move: (p) => {
      if (!finger) return;
      finger = p;
      if (path.length > 0 && previous() === POND && inPond(p)) {
        path = [];
        return;
      }
      const id = nodeAt(net, p);
      if (id < 0 || id === tip()) return;
      if (path.length >= 2 && id === previous()) {
        path.pop();
        return;
      }
      if (path.length < 3 && !path.includes(id) && isLinked(net, tip(), id)) path.push(id);
    },
    end: () => {
      const out = path;
      path = [];
      finger = null;
      return out;
    },
    active: () => finger !== null,
    path: () => path,
    finger: () => finger,
    lead,
  };
}

/** Bon chemin, mauvais chemin (avec ses galets fautifs), ou galerie inachevée. */
export function judge(net: Network, path: readonly number[]): Verdict {
  if (path.length < 3) return { kind: 'incomplete' };
  const wrong = path.flatMap((id, i) => (id === net.solution[i] ? [] : [i]));
  return wrong.length === 0 ? { kind: 'correct' } : { kind: 'wrong', wrong };
}
