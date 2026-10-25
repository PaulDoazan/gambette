import type { GameMeta } from '@gambette/game-sdk';

export interface PlayersBadge {
  /** Personnes dessinées sur la pastille. */
  people: 1 | 2;
  /** Mention entre les deux personnes : « 1v1 » en duel, « 1+1 » en équipe. */
  mark: '' | '1v1' | '1+1';
  /** Texte pour les lecteurs d'écran. */
  label: string;
}

/** Pastille des joueurs d'une carte du menu. */
export function playersBadge(players: GameMeta['players']): PlayersBadge {
  if (players === 'versus')
    return { people: 2, mark: '1v1', label: '2 joueurs, l’un contre l’autre' };
  if (players === 'coop') return { people: 2, mark: '1+1', label: '2 joueurs, en équipe' };
  return { people: 1, mark: '', label: '1 joueur' };
}
