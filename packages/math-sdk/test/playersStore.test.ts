import { describe, it, expect, beforeEach } from 'vitest';
import {
  calcsStorageKey,
  createPlayersCalcsStore,
  pairsOf,
  playersCalcsChanged,
} from '../src/store';
import type { Pair } from '../src/domain/calcs';

const P: Pair[] = [{ a: 7, b: 8, op: 'mul' }];
const Q: Pair[] = [{ a: 3, b: 4, op: 'add' }];
const DEFAULTS: Pair[] = [{ a: 2, b: 2, op: 'mul' }];
const store = () => createPlayersCalcsStore('game-a', { defaults: () => DEFAULTS });

beforeEach(() => localStorage.clear());

describe('createPlayersCalcsStore', () => {
  it('par défaut : mêmes calculs, le joueur du haut part de ceux du bas', () => {
    expect(store().load()).toEqual({ same: true, A: DEFAULTS, B: DEFAULTS });
  });

  it('reprend la sélection déjà enregistrée par le jeu pour le joueur du bas', () => {
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify(P));
    expect(store().load()).toEqual({ same: true, A: P, B: P });
  });

  it('save puis load fait l’aller-retour', () => {
    store().save({ same: false, A: P, B: Q });
    expect(store().load()).toEqual({ same: false, A: P, B: Q });
  });

  it('mêmes calculs réactivés : la sélection du haut reste enregistrée', () => {
    store().save({ same: false, A: P, B: Q });
    store().save({ same: true, A: P, B: Q });
    expect(store().load()).toEqual({ same: true, A: P, B: Q });
  });

  it('marqueur illisible → mêmes calculs', () => {
    store().save({ same: false, A: P, B: Q });
    localStorage.setItem(`${calcsStorageKey('game-a')}.same`, 'peut-être');
    expect(store().load().same).toBe(true);
  });
});

describe('pairsOf', () => {
  it('mêmes calculs : les deux joueurs jouent la sélection du bas', () => {
    expect(pairsOf({ same: true, A: P, B: Q })).toEqual({ A: P, B: P });
  });

  it('calculs séparés : chacun la sienne', () => {
    expect(pairsOf({ same: false, A: P, B: Q })).toEqual({ A: P, B: Q });
  });
});

describe('playersCalcsChanged', () => {
  const R: Pair[] = [...P, ...Q];
  it('ignore l’ordre des calculs', () => {
    expect(
      playersCalcsChanged({ same: true, A: R, B: R }, { same: true, A: [...R].reverse(), B: R }),
    ).toBe(false);
  });

  it('voit l’interrupteur, un calcul du bas ou du haut', () => {
    const base = { same: false, A: P, B: Q };
    expect(playersCalcsChanged(base, { ...base, same: true })).toBe(true);
    expect(playersCalcsChanged(base, { ...base, A: R })).toBe(true);
    expect(playersCalcsChanged(base, { ...base, B: P })).toBe(true);
  });
});
