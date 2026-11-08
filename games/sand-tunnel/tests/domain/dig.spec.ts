import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@gambette/math-sdk';
import { TRACK_MARGIN } from '../../src/config/dimensions';
import { createDig, judge } from '../../src/domain/dig';
import { generateNetwork, isLinked, POND } from '../../src/domain/network';

const net = generateNetwork({ a: 7, b: 6, op: 'mul' }, 0, mulberry32(5));
const at = (id: number) => net.nodes[id]!.pos;
const [S, O, E] = net.solution;

describe('createDig', () => {
  it('part de la mare et creuse nombre, opérateur, nombre en suivant les sillons', () => {
    const dig = createDig(net);
    expect(dig.begin(net.pond)).toBe(true);
    dig.move(at(S));
    dig.move(at(O));
    dig.move(at(E));
    expect(dig.path()).toEqual([S, O, E]);
    expect(dig.end()).toEqual([S, O, E]);
    expect(dig.active()).toBe(false);
  });

  it('peut partir directement d’un nombre de départ, pas d’un opérateur', () => {
    const dig = createDig(net);
    expect(dig.begin(at(O))).toBe(false);
    expect(dig.begin(at(S))).toBe(true);
    expect(dig.path()).toEqual([S]);
  });

  it('ignore un galet sans sillon depuis le dernier creusé', () => {
    const dig = createDig(net);
    dig.begin(net.pond);
    dig.move(at(S));
    const unlinked = net.nodes.find((n) => n.kind === 'op' && !isLinked(net, S, n.id));
    if (unlinked) {
      dig.move(unlinked.pos);
      expect(dig.path()).toEqual([S]);
    }
    // Sauter l'opérateur : un nombre d'arrivée n'est pas relié à un départ.
    dig.move(at(E));
    expect(dig.path()).toEqual([S]);
  });

  it('revenir sur le galet précédent annule le dernier ; revenir dans la mare annule tout', () => {
    const dig = createDig(net);
    dig.begin(net.pond);
    dig.move(at(S));
    dig.move(at(O));
    dig.move(at(S));
    expect(dig.path()).toEqual([S]);
    dig.move(net.pond);
    expect(dig.path()).toEqual([]);
  });

  it('pas plus de trois galets', () => {
    const dig = createDig(net);
    dig.begin(net.pond);
    for (const id of [S, O, E]) dig.move(at(id));
    for (const n of net.nodes) dig.move(n.pos);
    expect(dig.path().length).toBeLessThanOrEqual(3);
  });

  it('un doigt posé ailleurs ne creuse rien', () => {
    const dig = createDig(net);
    expect(dig.begin({ x: 5, y: 5 })).toBe(false);
    dig.move(at(S));
    expect(dig.path()).toEqual([]);
  });
});

/** Point à `t` sur le sillon a → b, décalé de `off` perpendiculairement. */
const onGroove = (a: { x: number; y: number }, b: { x: number; y: number }, t: number, off = 0) => {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = -(b.y - a.y) / len;
  const ny = (b.x - a.x) / len;
  return { x: a.x + (b.x - a.x) * t + nx * off, y: a.y + (b.y - a.y) * t + ny * off };
};

describe('lead : la galerie suit le sillon, pas le doigt', () => {
  it('le doigt près du sillon : la galerie avance le long du sillon jusqu’à sa hauteur', () => {
    const dig = createDig(net);
    dig.begin(net.pond);
    dig.move(at(S));
    const len = Math.hypot(at(O).x - at(S).x, at(O).y - at(S).y);
    dig.move(onGroove(at(S), at(O), 0.5, TRACK_MARGIN * 0.6));
    const lead = dig.lead();
    expect(lead?.toward).toBe(O);
    expect(lead!.len).toBeCloseTo(len / 2, 0);
  });

  it('le doigt s’écarte trop : plus de bout de galerie, elle s’arrête au dernier galet', () => {
    const dig = createDig(net);
    dig.begin(net.pond);
    dig.move(at(S));
    // Loin de tout sillon : au-delà de la mare, dans le coin opposé.
    dig.move({ x: at(S).x - 400, y: at(S).y + 400 });
    expect(dig.lead()).toBeNull();
    expect(dig.path()).toEqual([S]);
  });

  it('en arrière vers le galet précédent : la galerie raccourcit', () => {
    const dig = createDig(net);
    dig.begin(net.pond);
    dig.move(at(S));
    dig.move(at(O));
    dig.move(onGroove(at(O), at(S), 0.4));
    expect(dig.lead()?.toward).toBe(S);
  });

  it('seuls les sillons du dernier galet comptent : un sillon voisin n’attire pas la galerie', () => {
    const dig = createDig(net);
    dig.begin(net.pond);
    dig.move(at(S));
    for (const [a, b] of net.links) {
      if (a === S) continue;
      const p = onGroove(at(a), at(b), 0.5);
      dig.move(p);
      const lead = dig.lead();
      if (lead) expect(lead.toward === POND || isLinked(net, S, lead.toward)).toBe(true);
      expect(dig.path()).toEqual([S]);
    }
  });
});

describe('judge', () => {
  it('bon chemin, inachevé, ou mauvais avec les places fautives', () => {
    expect(judge(net, [S, O, E])).toEqual({ kind: 'correct' });
    expect(judge(net, [S, O])).toEqual({ kind: 'incomplete' });
    const otherEnd = net.links.find(([a, b]) => a === O && b !== E)?.[1];
    if (otherEnd !== undefined) {
      expect(judge(net, [S, O, otherEnd])).toEqual({ kind: 'wrong', wrong: [2] });
    }
    expect(isLinked(net, POND, S)).toBe(true);
  });
});
