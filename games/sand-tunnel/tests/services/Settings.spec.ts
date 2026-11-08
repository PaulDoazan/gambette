import { describe, it, expect, beforeEach } from 'vitest';
import type { Pair } from '@gambette/math-sdk';
import { loadSettings, saveSettings, settingsChanged } from '../../src/services/Settings';

const P: Pair[] = [
  { a: 6, b: 8, op: 'mul' },
  { a: 2, b: 3, op: 'add' },
];

beforeEach(() => localStorage.clear());

describe('Settings', () => {
  it('sans rien de stocké : une sélection par défaut non vide', () => {
    expect(loadSettings().calcs.length).toBeGreaterThan(0);
  });

  it('la sélection est conservée d’une partie à l’autre, sous la clé du jeu', () => {
    saveSettings({ calcs: P });
    expect(loadSettings().calcs).toEqual(P);
    expect(localStorage.getItem('gambette.sand-tunnel.calcs')).not.toBeNull();
  });

  it('settingsChanged ignore l’ordre, voit un ajout ou un retrait', () => {
    expect(settingsChanged({ calcs: P }, { calcs: [P[1]!, P[0]!] })).toBe(false);
    expect(settingsChanged({ calcs: P }, { calcs: [P[0]!] })).toBe(true);
  });
});
