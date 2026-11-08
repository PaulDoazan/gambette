import { createCalcsStore, playersCalcsChanged, type Pair } from '@gambette/math-sdk';

export interface Settings {
  /** Calculs dans lesquels on tire le résultat de chaque réseau. */
  calcs: Pair[];
}

const calcs = createCalcsStore('sand-tunnel');

export function loadSettings(): Settings {
  return { calcs: calcs.load() };
}

export function saveSettings(s: Settings): void {
  calcs.save(s.calcs);
}

/** La sélection a changé (l'ordre des calculs ne compte pas) : on relance la partie. */
export function settingsChanged(a: Settings, b: Settings): boolean {
  return playersCalcsChanged(
    { same: true, A: a.calcs, B: a.calcs },
    { same: true, A: b.calcs, B: b.calcs },
  );
}
