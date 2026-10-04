import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createCalcsStore, calcsStorageKey } from '../src/store';
import type { Pair } from '../src/domain/calcs';

const P: Pair[] = [
  { a: 7, b: 8, op: 'mul' },
  { a: 3, b: 4, op: 'add' },
];
const DEFAULTS: Pair[] = [{ a: 2, b: 2, op: 'mul' }];
const store = (key = 'game-a') => createCalcsStore(key, { defaults: () => DEFAULTS });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('createCalcsStore', () => {
  it('utilise la clé gambette.<gameKey>.calcs', () => {
    expect(calcsStorageKey('rabbit-math')).toBe('gambette.rabbit-math.calcs');
  });

  it('renvoie les valeurs par défaut quand rien n’est stocké', () => {
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('défaut sans option : 10 multiplications', () => {
    const pairs = createCalcsStore('game-x').load();
    expect(pairs).toHaveLength(10);
    expect(pairs.every((p) => p.op === 'mul')).toBe(true);
  });

  it('save puis load fait l’aller-retour', () => {
    store().save(P);
    expect(store().load()).toEqual(P);
  });

  it('isole les jeux entre eux', () => {
    store('game-a').save(P);
    expect(store('game-b').load()).toEqual(DEFAULTS);
  });

  it('JSON corrompu → défauts', () => {
    localStorage.setItem(calcsStorageKey('game-a'), '{pas du json');
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('forme invalide ou tableau vide → défauts', () => {
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify({ selectedPairs: P }));
    expect(store().load()).toEqual(DEFAULTS);
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([{ a: '7', b: 8 }]));
    expect(store().load()).toEqual(DEFAULTS);
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([]));
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('op absent → normalisé en mul ; op inconnu → défauts', () => {
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([{ a: 6, b: 7 }]));
    expect(store().load()).toEqual([{ a: 6, b: 7, op: 'mul' }]);
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([{ a: 6, b: 7, op: 'div' }]));
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('localStorage qui lève (navigation privée) → défauts, save silencieux', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(store().load()).toEqual(DEFAULTS);
    expect(() => store().save(P)).not.toThrow();
  });
});
