import { describe, it, expect } from 'vitest';
import { playersBadge } from '../lib/players';

describe('pastille des joueurs', () => {
  it('un jeu seul : une personne, sans mention', () => {
    expect(playersBadge('solo')).toEqual({ people: 1, mark: '', label: '1 joueur' });
  });

  it('un duel : deux personnes séparées par « v »', () => {
    expect(playersBadge('versus')).toEqual({
      people: 2,
      mark: 'v',
      label: '2 joueurs, l’un contre l’autre',
    });
  });

  it('en équipe : deux personnes séparées par « + »', () => {
    expect(playersBadge('coop')).toEqual({ people: 2, mark: '+', label: '2 joueurs, en équipe' });
  });

  it('non précisé : comme un jeu seul', () => {
    expect(playersBadge(undefined).people).toBe(1);
  });
});
