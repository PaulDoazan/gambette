import { computeAnswer, pickFrom, shuffle, type Op, type Pair, type Rng } from '@gambette/math-sdk';
import {
  DESIGN_WIDTH,
  EXIT_RADIUS,
  CHANNEL_WIDTH,
  NODE_RADIUS,
  POND_RADIUS,
  exitOf,
  networkArea,
  pondOf,
  uiBand,
} from '../config/dimensions';
import { dist, distToSegment } from './route';
import type { Vec } from './types';

/**
 * Réseau d'un écran : 3 nombres de départ (reliés à la mare), 3 opérateurs, 3 nombres d'arrivée
 * (reliés à la sortie). Un chemin mare → départ → opérateur → arrivée → sortie lit un calcul
 * « départ opérateur arrivée » ; un seul donne le résultat affiché.
 */
export type NetNode =
  | { readonly id: number; readonly kind: 'start' | 'end'; readonly value: number; pos: Vec }
  | { readonly id: number; readonly kind: 'op'; readonly op: Op; pos: Vec };

export interface Network {
  readonly pair: Pair;
  readonly result: number;
  /** Ids 0 à 2 : départs ; 3 à 5 : opérateurs ; 6 à 8 : arrivées (dans l'ordre des rangées). */
  readonly nodes: readonly NetNode[];
  /** Liaisons départ → opérateur et opérateur → arrivée (ids). */
  readonly links: ReadonlyArray<readonly [number, number]>;
  /** Le seul bon chemin : départ, opérateur, arrivée. */
  readonly solution: readonly [number, number, number];
  readonly pond: Vec;
  readonly exit: Vec;
}

/** Point de départ du geste : la mare. */
export const POND = -1;

const ROW = 3;
export const OPS: readonly Op[] = ['add', 'sub', 'mul'];
/**
 * Écartements essayés, du plus large au plus serré : on garde le plus large qui tient à l'écran.
 * `rows` : place des rangées le long de l'axe ; `spread` : écart entre deux galets d'une rangée.
 */
interface Spread {
  readonly rows: readonly [number, number, number];
  readonly spread: number;
}
/** Écartement de secours : le plus serré, qui tient sur tous les écrans. */
const TIGHT: Spread = { rows: [0.24, 0.5, 0.76], spread: 170 };
const SPREADS: readonly Spread[] = [
  { rows: [0.2, 0.5, 0.8], spread: 260 },
  { rows: [0.2, 0.5, 0.8], spread: 230 },
  { rows: [0.22, 0.5, 0.78], spread: 200 },
  TIGHT,
];
const JITTER = 36;
/** Marges : entre deux galets, et entre un galet et un sillon qui ne le concerne pas. */
const NODE_GAP = 26;
const GROOVE_CLEARANCE = NODE_RADIUS + 14;
const ATTEMPTS = 400;
const LAYOUTS_PER_SPREAD = 12;

/** Écart minimal entre un galet et le bandeau des boutons. */
const BAND_GAP = 6;
/** Un galet à la hauteur `y` est à côté du bandeau des boutons. */
const besideBand = (y: number): boolean => {
  const band = uiBand();
  return y > band.minY - NODE_RADIUS && y < band.maxY + NODE_RADIUS;
};

const idOf = (row: number, slot: number): number => row * ROW + slot;

/** `from` (un id, ou POND) mène à `to` par un sillon. */
export function isLinked(net: Network, from: number, to: number): boolean {
  const target = net.nodes[to];
  if (!target) return false;
  if (from === POND) return target.kind === 'start';
  return net.links.some(([a, b]) => a === from && b === to);
}

/** Valeur d'un chemin départ → opérateur → arrivée, ou null s'il n'en est pas un. */
export function pathValue(net: Network, path: readonly number[]): number | null {
  const [s, o, e] = path.map((id) => net.nodes[id]);
  if (path.length !== 3 || !s || !o || !e) return null;
  if (s.kind !== 'start' || o.kind !== 'op' || e.kind !== 'end') return null;
  return computeAnswer({ a: s.value, b: e.value, op: o.op });
}

/** Tous les chemins complets que permettent les sillons. */
export function allPaths(net: Network): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (const [s, o] of net.links) {
    if (net.nodes[s]?.kind !== 'start') continue;
    for (const [o2, e] of net.links) if (o2 === o) out.push([s, o, e]);
  }
  return out;
}

/** Chemins qui donnent le résultat affiché. */
export const solutions = (net: Network): Array<[number, number, number]> =>
  allPaths(net).filter((p) => pathValue(net, p) === net.result);

const range = (lo: number, hi: number): number[] =>
  Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);

/** `count` nombres proches de `v`, distincts, différents de `v`, au moins 1. */
function decoys(v: number, count: number, rng: Rng): number[] {
  const spread = Math.max(4, Math.round(v * 0.3));
  const pool = range(Math.max(1, v - spread), v + spread).filter((x) => x !== v);
  return shuffle(pool, rng).slice(0, count);
}

/** Emplacement voisin (ou le même) de `slot` dans une rangée de 3. */
const neighbour = (slot: number, rng: Rng): number => {
  if (slot === 0) return 1;
  if (slot === ROW - 1) return ROW - 2;
  return rng() < 0.5 ? slot - 1 : slot + 1;
};
const nearSlot = (slot: number, rng: Rng): number =>
  Math.max(0, Math.min(ROW - 1, slot + pickFrom([-1, 0, 1], rng)));

/**
 * Liaisons d'une rangée à la suivante : chaque galet va vers celui de sa place et vers un voisin ;
 * celui du bon chemin va forcément vers le suivant du bon chemin.
 */
function rowLinks(
  fromRow: number,
  goodFrom: number,
  goodTo: number,
  rng: Rng,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let j = 0; j < ROW; j++) {
    const other = j === goodFrom && goodTo !== j ? goodTo : neighbour(j, rng);
    out.push(
      [idOf(fromRow, j), idOf(fromRow + 1, j)],
      [idOf(fromRow, j), idOf(fromRow + 1, other)],
    );
  }
  return out;
}

/** Segments que les galets ne doivent pas toucher, hors sillons : canaux d'entrée et de sortie. */
function channels(k: number): Array<[Vec, Vec]> {
  const pond = pondOf(k);
  const exit = exitOf(k);
  return [
    [{ x: k * DESIGN_WIDTH, y: pond.y }, pond],
    [exit, { x: (k + 1) * DESIGN_WIDTH, y: exit.y }],
  ];
}

/** Galets bien séparés, hors du bandeau des boutons, de la mare, de la sortie et des canaux ; aucun sillon ne passe dessus. */
export function layoutValid(net: Network, k: number): boolean {
  const { nodes, pond, exit } = net;
  const band = uiBand();
  for (let i = 0; i < nodes.length; i++) {
    const p = nodes[i]!.pos;
    const x = p.x - k * DESIGN_WIDTH;
    if (
      x < band.maxX + NODE_RADIUS &&
      p.y > band.minY - NODE_RADIUS &&
      p.y < band.maxY + NODE_RADIUS
    ) {
      return false;
    }
    if (dist(p, pond) < POND_RADIUS + NODE_RADIUS + 24) return false;
    if (dist(p, exit) < EXIT_RADIUS + NODE_RADIUS + 30) return false;
    for (let j = i + 1; j < nodes.length; j++) {
      if (dist(p, nodes[j]!.pos) < 2 * NODE_RADIUS + NODE_GAP) return false;
    }
    for (const [a, b] of channels(k)) {
      if (distToSegment(p, a, b) < NODE_RADIUS + CHANNEL_WIDTH / 2 + 12) return false;
    }
  }
  const grooves: ReadonlyArray<readonly [number | Vec, number | Vec]> = [
    ...nodes.filter((n) => n.kind === 'start').map((n): [Vec, number] => [pond, n.id]),
    ...net.links,
    ...nodes.filter((n) => n.kind === 'end').map((n): [number, Vec] => [n.id, exit]),
  ];
  const at = (e: number | Vec): Vec => (typeof e === 'number' ? nodes[e]!.pos : e);
  for (const [a, b] of grooves) {
    for (const n of nodes) {
      if (n.id === a || n.id === b) continue;
      if (distToSegment(n.pos, at(a), at(b)) < GROOVE_CLEARANCE) return false;
    }
  }
  return true;
}

/** Galets en trois bandes le long de l'axe mare → sortie, décalés de `jitter` au plus. */
function place(net: Network, k: number, sp: Spread, jitter: number, rng: Rng): void {
  const { pond, exit } = net;
  const len = dist(pond, exit);
  const d = { x: (exit.x - pond.x) / len, y: (exit.y - pond.y) / len };
  // Perpendiculaire orientée pour que la place 0 soit toujours du même côté.
  const n = { x: -d.y, y: d.x };
  const area = networkArea();
  const band = uiBand();
  const ox = k * DESIGN_WIDTH;
  for (const node of net.nodes) {
    const row = Math.floor(node.id / ROW);
    const slot = node.id % ROW;
    const t = sp.rows[row]!;
    const off = (slot - 1) * sp.spread;
    const x = pond.x + d.x * len * t + n.x * off + (rng() * 2 - 1) * jitter;
    const y = pond.y + d.y * len * t + n.y * off + (rng() * 2 - 1) * jitter;
    const cy = Math.min(area.maxY, Math.max(area.minY, y));
    // À hauteur du bandeau des boutons, le galet est repoussé à sa droite.
    const minX = besideBand(cy) ? band.maxX + NODE_RADIUS + BAND_GAP : area.minX;
    node.pos = {
      x: Math.min(ox + area.maxX, Math.max(ox + minX, x)),
      y: cy,
    };
  }
}

/**
 * Opérateurs des 3 galets du milieu, celui du calcul à la place `good` : les autres sont pris parmi
 * `allowed` (les opérateurs des réglages), distincts tant qu'il y en a assez. Que des × si les
 * réglages ne proposent que des multiplications.
 */
function opsRow(op: Op, good: number, allowed: readonly Op[], rng: Rng): Op[] {
  const pool = allowed.includes(op) ? allowed : [...allowed, op];
  const others = shuffle(
    pool.filter((o) => o !== op),
    rng,
  );
  while (others.length < ROW - 1) others.push(pickFrom(pool, rng));
  const ops = others.slice(0, ROW - 1);
  ops.splice(good, 0, op);
  return ops;
}

/** Un essai : le calcul, ses leurres et ses liaisons, sans placement. */
function draft(pair: Pair, k: number, rng: Rng, allowed: readonly Op[]): Network {
  const goodStart = Math.floor(rng() * ROW);
  const goodOp = nearSlot(goodStart, rng);
  const goodEnd = nearSlot(goodOp, rng);
  const starts = decoys(pair.a, ROW - 1, rng);
  starts.splice(goodStart, 0, pair.a);
  const ends = decoys(pair.b, ROW - 1, rng);
  ends.splice(goodEnd, 0, pair.b);
  const ops = opsRow(pair.op, goodOp, allowed, rng);
  const origin = { x: 0, y: 0 };
  const nodes: NetNode[] = [
    ...starts.map((value, j): NetNode => ({ id: idOf(0, j), kind: 'start', value, pos: origin })),
    ...ops.map((op, j): NetNode => ({ id: idOf(1, j), kind: 'op', op, pos: origin })),
    ...ends.map((value, j): NetNode => ({ id: idOf(2, j), kind: 'end', value, pos: origin })),
  ];
  const links = [...rowLinks(0, goodStart, goodOp, rng), ...rowLinks(1, goodOp, goodEnd, rng)];
  // Doublons (un galet relié deux fois au même) retirés.
  const unique = links.filter(
    ([a, b], i) => links.findIndex(([c, d2]) => c === a && d2 === b) === i,
  );
  return {
    pair,
    result: computeAnswer(pair),
    nodes,
    links: unique,
    solution: [idOf(0, goodStart), idOf(1, goodOp), idOf(2, goodEnd)],
    pond: pondOf(k),
    exit: exitOf(k),
  };
}

/** Retire les liaisons hors du bon chemin qui mènent à un autre chemin donnant le résultat. */
function forceUnique(net: Network): Network {
  const good = net.solution;
  const onGood = ([a, b]: readonly [number, number]): boolean =>
    (a === good[0] && b === good[1]) || (a === good[1] && b === good[2]);
  let links = [...net.links];
  for (const p of solutions(net)) {
    if (p.every((id, i) => id === good[i])) continue;
    const bad = links.find(
      (l) => !onGood(l) && ((l[0] === p[0] && l[1] === p[1]) || (l[0] === p[1] && l[1] === p[2])),
    );
    links = links.filter((l) => l !== bad);
  }
  return { ...net, links };
}

/**
 * Réseau de l'écran `k` pour le calcul `pair` : un seul chemin donne son résultat, et une mauvaise
 * option ne coupe jamais le bon chemin (aucun galet sur un sillon qui ne le concerne pas). Les
 * opérateurs proposés sont pris parmi `allowed`.
 */
export function generateNetwork(
  pair: Pair,
  k: number,
  rng: Rng,
  allowed: readonly Op[] = OPS,
): Network {
  let fallback: Network | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const net = draft(pair, k, rng, allowed);
    if (solutions(net).length !== 1) continue;
    fallback ??= net;
    for (const sp of SPREADS) {
      for (let l = 0; l < LAYOUTS_PER_SPREAD; l++) {
        place(net, k, sp, JITTER, rng);
        if (layoutValid(net, k)) return net;
      }
    }
  }
  // Filet de sécurité : galets à leur place exacte, liaisons gênantes retirées.
  const net = forceUnique(fallback ?? draft(pair, k, rng, allowed));
  place(net, k, TIGHT, 0, rng);
  return net;
}
