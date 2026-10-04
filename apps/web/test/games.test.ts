import { describe, it, expect } from 'vitest';
import { registry } from '../games';

describe('registre de jeux', () => {
  it('contient rabbit-math avec une consigne', () => {
    const game = registry.get('rabbit-math');
    expect(game).toBeDefined();
    expect(game!.meta.instructions.length).toBeGreaterThan(0);
  });

  it('chaque jeu listé est résolu par sa clé', () => {
    for (const m of registry.list()) expect(registry.get(m.meta.key)).toBe(m);
  });
});
