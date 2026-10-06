import { createCalcsStore, type Pair } from '@gambette/math-sdk';
import { DEFAULT_PUCKS, MAX_PUCKS, MIN_PUCKS } from '../config/dimensions';

export const SETTINGS_KEY = 'gambette.passe-trappe.settings';

export interface Settings {
  pucksPerPlayer: number;
  selectedPairs: Pair[];
}

const calcs = createCalcsStore('passe-trappe');

const clampPucks = (n: number): number => Math.max(MIN_PUCKS, Math.min(MAX_PUCKS, Math.round(n)));

const readPucks = (): number => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const v = raw === null ? null : (JSON.parse(raw) as { pucksPerPlayer?: unknown });
    return typeof v?.pucksPerPlayer === 'number' ? clampPucks(v.pucksPerPlayer) : DEFAULT_PUCKS;
  } catch {
    return DEFAULT_PUCKS;
  }
};

export function loadSettings(): Settings {
  return { pucksPerPlayer: readPucks(), selectedPairs: calcs.load() };
}

export function saveSettings(s: Settings): void {
  calcs.save(s.selectedPairs);
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ pucksPerPlayer: clampPucks(s.pucksPerPlayer) }),
    );
  } catch {
    // Stockage indisponible : réglages conservés en mémoire pour la session.
  }
}

const pairKey = (p: Pair): string => `${p.op}:${p.a}:${p.b}`;

export function settingsChanged(a: Settings, b: Settings): boolean {
  if (a.pucksPerPlayer !== b.pucksPerPlayer) return true;
  const ka = new Set(a.selectedPairs.map(pairKey));
  return (
    a.selectedPairs.length !== b.selectedPairs.length ||
    !b.selectedPairs.every((p) => ka.has(pairKey(p)))
  );
}
