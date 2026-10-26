import { describe, it, expect, beforeEach } from 'vitest';
import { THEME_KEY, loadThemeChoice, saveThemeChoice } from '../composables/useColorMode';

describe('mode sombre', () => {
  beforeEach(() => localStorage.clear());

  it('le choix est gardé d’une visite à l’autre', () => {
    expect(loadThemeChoice()).toBeNull();
    saveThemeChoice('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(loadThemeChoice()).toBe('dark');
  });

  it('une valeur inconnue en mémoire est ignorée', () => {
    localStorage.setItem(THEME_KEY, 'bleu');
    expect(loadThemeChoice()).toBeNull();
  });
});
