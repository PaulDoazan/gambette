import { createCalcsStore, randomMulPairs, type Pair } from '@gambette/math-sdk';
import { readJson, writeJson } from './Storage';

export type RabbitsCount = 4 | 5 | 6 | 7 | 8;

export interface Settings {
  selectedPairs: Pair[];
  rabbitsCount: RabbitsCount;
  tapMode: boolean;
}

/** Réglages propres au jeu (hors calculs, gérés par math-sdk). */
interface Prefs {
  rabbitsCount: RabbitsCount;
  tapMode: boolean;
}

export const SETTINGS_KEY = 'gambette.rabbit-math.settings';

export const DEFAULT_SETTINGS: Settings = {
  selectedPairs: randomMulPairs(),
  rabbitsCount: 4,
  tapMode: false,
};

const calcs = createCalcsStore('rabbit-math', {
  defaults: () => DEFAULT_SETTINGS.selectedPairs,
});

const isRabbitsCount = (v: unknown): v is RabbitsCount =>
  v === 4 || v === 5 || v === 6 || v === 7 || v === 8;

const isPrefs = (v: unknown): v is Prefs => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const known = new Set(['rabbitsCount', 'tapMode']);
  if (!Object.keys(o).every((k) => known.has(k))) return false;
  return isRabbitsCount(o.rabbitsCount) && typeof o.tapMode === 'boolean';
};

const clampRabbits = (n: number): RabbitsCount => {
  const i = Math.max(4, Math.min(8, Math.floor(n)));
  return i as RabbitsCount;
};

export function validateSettings(s: Settings): Settings {
  return {
    ...s,
    rabbitsCount: clampRabbits(s.rabbitsCount),
    selectedPairs: s.selectedPairs.length >= 1 ? s.selectedPairs : randomMulPairs(),
  };
}

const readPrefs = (): Prefs => {
  let raw: unknown = null;
  try {
    raw = readJson<unknown>(SETTINGS_KEY);
  } catch {
    // Stockage indisponible : défauts.
  }
  return isPrefs(raw)
    ? raw
    : { rabbitsCount: DEFAULT_SETTINGS.rabbitsCount, tapMode: DEFAULT_SETTINGS.tapMode };
};

export function loadSettings(): Settings {
  return validateSettings({ selectedPairs: calcs.load(), ...readPrefs() });
}

export function saveSettings(s: Settings): void {
  const v = validateSettings(s);
  calcs.save(v.selectedPairs);
  try {
    writeJson(SETTINGS_KEY, { rabbitsCount: v.rabbitsCount, tapMode: v.tapMode });
  } catch {
    // Stockage indisponible : réglages conservés en mémoire pour la session.
  }
}
