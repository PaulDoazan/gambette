import { describe, it, expect } from 'vitest';
import { createCrossingDetector, RENEW_COOLDOWN_MS } from '../../src/domain/crossings';
import type { Player } from '../../src/domain/types';

const start: Player[] = ['A', 'A', 'B', 'B'];
const moved: Player[] = ['B', 'A', 'B', 'B'];

describe('createCrossingDetector', () => {
  it('pas de changement de camp → pas de renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(start, 1000)).toBe(false);
    expect(d.update(start, 5000)).toBe(false);
  });

  it('passage net → un seul renouvellement, une fois les camps stables depuis la fenêtre', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(moved, 1000)).toBe(false);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS - 1)).toBe(false);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS)).toBe(true);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS + 16)).toBe(false);
    expect(d.update(moved, 5000)).toBe(false);
  });

  it('aller-retour rapide revenu aux camps étiquetés → aucun renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(moved, 1000)).toBe(false);
    expect(d.update(start, 1100)).toBe(false);
    expect(d.update(start, 1100 + RENEW_COOLDOWN_MS)).toBe(false);
    expect(d.update(start, 5000)).toBe(false);
  });

  it('oscillation qui finit dans l’autre camp → un seul renouvellement, après stabilisation', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(moved, 1000)).toBe(false);
    expect(d.update(start, 1100)).toBe(false);
    expect(d.update(moved, 1200)).toBe(false);
    expect(d.update(moved, 1200 + RENEW_COOLDOWN_MS - 1)).toBe(false);
    expect(d.update(moved, 1200 + RENEW_COOLDOWN_MS)).toBe(true);
    expect(d.update(moved, 5000)).toBe(false);
  });

  it('deux passages espacés → deux renouvellements', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    d.update(moved, 1000);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS)).toBe(true);
    const both: Player[] = ['B', 'B', 'B', 'B'];
    d.update(both, 2000);
    expect(d.update(both, 2000 + RENEW_COOLDOWN_MS)).toBe(true);
  });
});
