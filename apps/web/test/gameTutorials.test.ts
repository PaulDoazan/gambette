import { describe, it, expect } from 'vitest';
import { registry } from '../games';
import { gameTutorial } from '../lib/gameTutorials';

describe('tutoriels des jeux', () => {
  it('chaque jeu a 2 ou 3 étapes, chacune avec une capture et un texte', () => {
    for (const m of registry.list()) {
      const steps = gameTutorial(m.meta.key);
      expect(steps.length, m.meta.key).toBeGreaterThanOrEqual(2);
      expect(steps.length, m.meta.key).toBeLessThanOrEqual(3);
      for (const s of steps) {
        expect(s.image, m.meta.key).toMatch(/\.webp/);
        expect(s.text.length, m.meta.key).toBeGreaterThan(10);
      }
    }
  });

  it('un jeu sans tutoriel n’en affiche pas', () => {
    expect(gameTutorial('jeu-inconnu')).toEqual([]);
  });
});
