import { describe, it, expect, beforeEach } from 'vitest';
import { calcsStorageKey } from '@gambette/math-sdk';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  validateSettings,
} from '../../src/services/Settings';

beforeEach(() => localStorage.clear());

describe('Settings defaults & round-trip', () => {
  it('loadSettings renvoie les défauts quand rien n’est stocké', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('la sélection par défaut est 10 multiplications', () => {
    expect(DEFAULT_SETTINGS.selectedPairs).toHaveLength(10);
    expect(DEFAULT_SETTINGS.selectedPairs.every((p) => p.op === 'mul')).toBe(true);
  });

  it('rabbitsCount par défaut = 4', () => {
    expect(DEFAULT_SETTINGS.rabbitsCount).toBe(4);
  });

  it('saveSettings puis loadSettings fait l’aller-retour', () => {
    const next = {
      selectedPairs: [{ a: 3, b: 4, op: 'add' as const }],
      rabbitsCount: 6 as const,
      tapMode: true,
    };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
  });
});

describe('Settings stockage', () => {
  it('les calculs vont dans le store math-sdk, le reste sous SETTINGS_KEY', () => {
    expect(SETTINGS_KEY).toBe('gambette.rabbit-math.settings');
    saveSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 5 });
    expect(JSON.parse(localStorage.getItem(calcsStorageKey('rabbit-math'))!)).toEqual(
      DEFAULT_SETTINGS.selectedPairs,
    );
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({
      rabbitsCount: 5,
      tapMode: false,
    });
  });

  it('préférences invalides → défauts pour rabbitsCount/tapMode', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ rabbitsCount: 'x', extra: 1 }));
    const s = loadSettings();
    expect(s.rabbitsCount).toBe(DEFAULT_SETTINGS.rabbitsCount);
    expect(s.tapMode).toBe(DEFAULT_SETTINGS.tapMode);
  });
});

describe('Settings validation', () => {
  it('validateSettings borne rabbitsCount dans [4,8]', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 2 as 4 }).rabbitsCount).toBe(4);
    expect(validateSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 12 as 4 }).rabbitsCount).toBe(8);
    expect(validateSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 5.7 as 5 }).rabbitsCount).toBe(5);
  });

  it('validateSettings remet 10 multiplications si la sélection est vide', () => {
    const fixed = validateSettings({ ...DEFAULT_SETTINGS, selectedPairs: [] });
    expect(fixed.selectedPairs).toHaveLength(10);
    expect(fixed.selectedPairs.every((p) => p.op === 'mul')).toBe(true);
  });
});
