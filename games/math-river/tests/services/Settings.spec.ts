import { describe, it, expect, beforeEach } from 'vitest';
import type { Pair } from '@gambette/math-sdk';
import { loadSettings, saveSettings, settingsChanged } from '../../src/services/Settings';

const P: Pair[] = [
  { a: 6, b: 8, op: 'mul' },
  { a: 2, b: 3, op: 'add' },
];
const Q: Pair[] = [{ a: 9, b: 9, op: 'mul' }];
const same = (A: Pair[]) => ({ calcs: { same: true, A, B: A } });

beforeEach(() => localStorage.clear());

describe('Settings', () => {
  it('sans rien de stocké : une sélection par défaut non vide', () => {
    const { calcs } = loadSettings();
    expect(calcs.same).toBe(true);
    expect(calcs.A.length).toBeGreaterThan(0);
  });

  it('la sélection est conservée d’une partie à l’autre', () => {
    saveSettings({ calcs: { same: false, A: P, B: Q } });
    expect(loadSettings().calcs).toEqual({ same: false, A: P, B: Q });
  });

  it('settingsChanged ignore l’ordre, voit un ajout ou un retrait', () => {
    expect(settingsChanged(same(P), same([P[1]!, P[0]!]))).toBe(false);
    expect(settingsChanged(same(P), same([P[0]!]))).toBe(true);
  });

  it('settingsChanged voit l’interrupteur et la sélection du joueur du haut', () => {
    expect(settingsChanged(same(P), { calcs: { same: false, A: P, B: P } })).toBe(true);
    expect(
      settingsChanged(
        { calcs: { same: false, A: P, B: P } },
        { calcs: { same: false, A: P, B: Q } },
      ),
    ).toBe(true);
  });
});
