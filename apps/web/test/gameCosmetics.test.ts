import { describe, it, expect } from 'vitest';
import { registry } from '../games';
import { gameCosmetic } from '../lib/gameCosmetics';

describe('habillage des jeux', () => {
  it('chaque jeu a sa vignette et une couleur pour le bandeau du titre', () => {
    for (const m of registry.list()) {
      const c = gameCosmetic(m.meta.key);
      expect(c.thumbnail, m.meta.key).toMatch(/\.svg/);
      expect(c.band, m.meta.key).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
