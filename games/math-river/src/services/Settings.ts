import {
  createPlayersCalcsStore,
  playersCalcsChanged,
  type PlayersCalcs,
} from '@gambette/math-sdk';

export interface Settings {
  /** Calculs de chaque joueur, ou les mêmes pour les deux. */
  calcs: PlayersCalcs;
}

const calcs = createPlayersCalcsStore('math-river');

export function loadSettings(): Settings {
  return { calcs: calcs.load() };
}

export function saveSettings(s: Settings): void {
  calcs.save(s.calcs);
}

export function settingsChanged(a: Settings, b: Settings): boolean {
  return playersCalcsChanged(a.calcs, b.calcs);
}
