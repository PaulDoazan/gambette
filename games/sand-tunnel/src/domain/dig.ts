import { HIT_RADIUS, POND_RADIUS } from '../config/dimensions';
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

/** Geste de creusage sur le réseau `net` : nombre, opérateur, nombre, en suivant les sillons. */
export function createDig(net: Network): Dig {
  let path: number[] = [];
  let finger: Vec | null = null;

  const tip = (): number => (path.length > 0 ? path[path.length - 1]! : POND);
  const previous = (): number => (path.length >= 2 ? path[path.length - 2]! : POND);
  const inPond = (p: Vec): boolean => dist(p, net.pond) <= POND_RADIUS;

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
  };
}

/** Bon chemin, mauvais chemin (avec ses galets fautifs), ou galerie inachevée. */
export function judge(net: Network, path: readonly number[]): Verdict {
  if (path.length < 3) return { kind: 'incomplete' };
  const wrong = path.flatMap((id, i) => (id === net.solution[i] ? [] : [i]));
  return wrong.length === 0 ? { kind: 'correct' } : { kind: 'wrong', wrong };
}
