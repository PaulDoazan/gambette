import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { calcsStorageKey } from '@gambette/math-sdk';
import {
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  settingsChanged,
} from '../../src/services/Settings';
import { DEFAULT_PUCKS } from '../../src/config/dimensions';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Settings passe-trappe', () => {
  it('défauts : 5 palets, 10 multiplications', () => {
    const s = loadSettings();
    expect(s.pucksPerPlayer).toBe(DEFAULT_PUCKS);
    expect(s.selectedPairs).toHaveLength(10);
  });

  it('aller-retour, calculs dans le store du math-sdk', () => {
    const next = { pucksPerPlayer: 8, selectedPairs: [{ a: 3, b: 4, op: 'add' as const }] };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ pucksPerPlayer: 8 });
    expect(JSON.parse(localStorage.getItem(calcsStorageKey('passe-trappe'))!)).toEqual(
      next.selectedPairs,
    );
  });

  it('borné à [5, 10]', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ pucksPerPlayer: 42 }));
    expect(loadSettings().pucksPerPlayer).toBe(10);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ pucksPerPlayer: 1 }));
    expect(loadSettings().pucksPerPlayer).toBe(5);
  });

  it('donnée corrompue ou stockage qui lève → défaut, sans erreur', () => {
    localStorage.setItem(SETTINGS_KEY, '{pas du json');
    expect(loadSettings().pucksPerPlayer).toBe(DEFAULT_PUCKS);
    // Le shim MemoryStorage porte les méthodes sur son prototype.
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    const getItem = vi.spyOn(proto, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setItem = vi.spyOn(proto, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(loadSettings().pucksPerPlayer).toBe(DEFAULT_PUCKS);
    expect(() => saveSettings({ pucksPerPlayer: 6, selectedPairs: [] })).not.toThrow();
    expect(getItem).toHaveBeenCalled();
    expect(setItem).toHaveBeenCalled();
  });

  it('settingsChanged : nombre de palets ou calculs', () => {
    const a = { pucksPerPlayer: 5, selectedPairs: [{ a: 6, b: 8, op: 'mul' as const }] };
    expect(settingsChanged(a, { ...a })).toBe(false);
    expect(settingsChanged(a, { ...a, pucksPerPlayer: 6 })).toBe(true);
    expect(settingsChanged(a, { ...a, selectedPairs: [{ a: 7, b: 8, op: 'mul' }] })).toBe(true);
  });
});
