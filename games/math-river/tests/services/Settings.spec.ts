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
    expect(loadSettings().selectedPairs.length).toBeGreaterThan(0);
  });

  it('la sélection est conservée d’une partie à l’autre', () => {
    saveSettings({ selectedPairs: P });
    expect(loadSettings().selectedPairs).toEqual(P);
  });

  it('settingsChanged ignore l’ordre, voit un ajout ou un retrait', () => {
    expect(settingsChanged({ selectedPairs: P }, { selectedPairs: [P[1]!, P[0]!] })).toBe(false);
    expect(settingsChanged({ selectedPairs: P }, { selectedPairs: [P[0]!] })).toBe(true);
  });
});
