import { describe, it, expect } from 'vitest';
import { createCrossingDetector, RENEW_COOLDOWN_MS } from '../../src/domain/crossings';
import type { Player } from '../../src/domain/types';

const start: Player[] = ['A', 'A', 'B', 'B'];

describe('createCrossingDetector', () => {
  it('pas de changement de camp → pas de renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(start, 1000)).toBe(false);
  });

  it('un palet change de camp → renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(['B', 'A', 'B', 'B'], 1000)).toBe(true);
    expect(d.update(['B', 'A', 'B', 'B'], 1016)).toBe(false);
  });

  it('oscillation dans la fenêtre qui revient au camp renouvelé → un seul renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(['B', 'A', 'B', 'B'], 1000)).toBe(true);
    expect(d.update(['A', 'A', 'B', 'B'], 1100)).toBe(false);
    expect(d.update(['B', 'A', 'B', 'B'], 1200)).toBe(false);
    expect(d.update(['B', 'A', 'B', 'B'], 1000 + RENEW_COOLDOWN_MS + 50)).toBe(false);
  });

  it('retour dans la fenêtre puis immobile → renouvellement différé à la fin de la fenêtre', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    d.update(['B', 'A', 'B', 'B'], 1000);
    expect(d.update(['A', 'A', 'B', 'B'], 1100)).toBe(false);
    expect(d.update(['A', 'A', 'B', 'B'], 1000 + RENEW_COOLDOWN_MS)).toBe(true);
  });

  it('deux passages espacés → deux renouvellements', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(['B', 'A', 'B', 'B'], 1000)).toBe(true);
    expect(d.update(['B', 'B', 'B', 'B'], 2000)).toBe(true);
  });
});
