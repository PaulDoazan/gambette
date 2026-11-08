import { afterEach, describe, it, expect } from 'vitest';
import {
  allAddPairs,
  allMulPairs,
  allSubPairs,
  computeAnswer,
  mulberry32,
  twoDigitPairs,
  type Pair,
} from '@gambette/math-sdk';
import {
  MAX_BOARD_HEIGHT,
  MIN_BOARD_HEIGHT,
  SCREENS,
  configureBoard,
} from '../../src/config/dimensions';
import {
  POND,
  allPaths,
  generateNetwork,
  isLinked,
  layoutValid,
  pathValue,
  solutions,
} from '../../src/domain/network';

const PAIRS: Pair[] = [
  ...allMulPairs(),
  ...allAddPairs(),
  ...allSubPairs(),
  ...twoDigitPairs('add', 10, 30).filter((_, i) => i % 7 === 0),
];

afterEach(() => configureBoard(MIN_BOARD_HEIGHT));

describe('generateNetwork', () => {
  it('9 galets : 3 départs, 3 opérateurs distincts, 3 arrivées', () => {
    const net = generateNetwork({ a: 7, b: 6, op: 'mul' }, 0, mulberry32(1));
    expect(net.nodes.map((n) => n.kind)).toEqual([
      'start',
      'start',
      'start',
      'op',
      'op',
      'op',
      'end',
      'end',
      'end',
    ]);
    const ops = net.nodes.flatMap((n) => (n.kind === 'op' ? [n.op] : []));
    expect(new Set(ops)).toEqual(new Set(['add', 'sub', 'mul']));
    expect(net.result).toBe(42);
  });

  it('le bon chemin est relié de la mare à la sortie et lit le calcul tiré', () => {
    const pair: Pair = { a: 8, b: 3, op: 'sub' };
    const net = generateNetwork(pair, 1, mulberry32(4));
    const [s, o, e] = net.solution;
    expect(isLinked(net, POND, s)).toBe(true);
    expect(isLinked(net, s, o)).toBe(true);
    expect(isLinked(net, o, e)).toBe(true);
    expect(pathValue(net, net.solution)).toBe(computeAnswer(pair));
  });

  it('tous les calculs des réglages, sur les trois écrans et les deux hauteurs extrêmes : un seul bon chemin, un placement valide', () => {
    for (const h of [MIN_BOARD_HEIGHT, MAX_BOARD_HEIGHT]) {
      configureBoard(h);
      PAIRS.forEach((pair, i) => {
        const k = i % SCREENS;
        const net = generateNetwork(pair, k, mulberry32(i * 31 + h));
        expect(solutions(net), `${pair.a} ${pair.op} ${pair.b}`).toEqual([[...net.solution]]);
        expect(layoutValid(net, k), `${pair.a} ${pair.op} ${pair.b} écran ${k}`).toBe(true);
        // Les nombres d'une même rangée sont distincts.
        for (const kind of ['start', 'end'] as const) {
          const values = net.nodes.flatMap((n) => (n.kind === kind ? [n.value] : []));
          expect(new Set(values).size).toBe(3);
        }
      });
    }
  });

  it('que des × si les réglages ne proposent que des multiplications, et un seul bon chemin', () => {
    for (const h of [MIN_BOARD_HEIGHT, MAX_BOARD_HEIGHT]) {
      configureBoard(h);
      allMulPairs().forEach((pair, i) => {
        const k = i % SCREENS;
        const net = generateNetwork(pair, k, mulberry32(i * 17 + h), ['mul']);
        const ops = net.nodes.flatMap((n) => (n.kind === 'op' ? [n.op] : []));
        expect(ops).toEqual(['mul', 'mul', 'mul']);
        expect(solutions(net), `${pair.a} × ${pair.b}`).toEqual([[...net.solution]]);
        expect(layoutValid(net, k)).toBe(true);
      });
    }
  });

  it('opérateurs pris parmi ceux des réglages', () => {
    [...allAddPairs(), ...allSubPairs()].forEach((pair, i) => {
      const net = generateNetwork(pair, i % SCREENS, mulberry32(i), ['add', 'sub']);
      const ops = net.nodes.flatMap((n) => (n.kind === 'op' ? [n.op] : []));
      expect(ops).not.toContain('mul');
      expect(new Set(ops)).toEqual(new Set(['add', 'sub']));
      expect(solutions(net)).toEqual([[...net.solution]]);
    });
  });

  it('plusieurs chemins possibles : il y a de vrais choix à faire', () => {
    const net = generateNetwork({ a: 6, b: 4, op: 'mul' }, 0, mulberry32(9));
    expect(allPaths(net).length).toBeGreaterThanOrEqual(6);
  });

  it('les galets restent dans leur écran', () => {
    for (let k = 0; k < SCREENS; k++) {
      const net = generateNetwork({ a: 5, b: 5, op: 'add' }, k, mulberry32(k));
      for (const n of net.nodes) {
        expect(n.pos.x).toBeGreaterThan(k * 720 + 100);
        expect(n.pos.x).toBeLessThan(k * 720 + 640);
      }
    }
  });
});

describe('pathValue', () => {
  it('rejette un chemin incomplet ou dans le désordre', () => {
    const net = generateNetwork({ a: 2, b: 9, op: 'add' }, 0, mulberry32(2));
    const [s, o, e] = net.solution;
    expect(pathValue(net, [s, o])).toBeNull();
    expect(pathValue(net, [o, s, e])).toBeNull();
  });
});
