export type Player = 'A' | 'B';

export interface Vec {
  x: number;
  y: number;
}

/** Élastique tendu d'un mur latéral à l'autre, horizontal au repos. */
export interface ElasticLine {
  y: number;
  left: Vec;
  right: Vec;
}

export const PLAYERS: readonly Player[] = ['A', 'B'];
