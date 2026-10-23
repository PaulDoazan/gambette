import { createCalcsStore, type Pair } from '@gambette/math-sdk';

export interface Settings {
  selectedPairs: Pair[];
}

const calcs = createCalcsStore('math-river');

export function loadSettings(): Settings {
  return { selectedPairs: calcs.load() };
}

export function saveSettings(s: Settings): void {
  calcs.save(s.selectedPairs);
}

const pairKey = (p: Pair): string => `${p.op}:${p.a}:${p.b}`;

export function settingsChanged(a: Settings, b: Settings): boolean {
  const ka = new Set(a.selectedPairs.map(pairKey));
  return (
    a.selectedPairs.length !== b.selectedPairs.length ||
    !b.selectedPairs.every((p) => ka.has(pairKey(p)))
  );
}
