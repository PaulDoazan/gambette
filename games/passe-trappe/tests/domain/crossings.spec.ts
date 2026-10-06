import { describe, it, expect } from 'vitest';
import { createCrossingDetector, RENEW_COOLDOWN_MS } from '../../src/domain/crossings';
import type { Player } from '../../src/domain/types';

const start: Player[] = ['A', 'A', 'B', 'B'];
const moved: Player[] = ['B', 'A', 'B', 'B'];

describe('createCrossingDetector', () => {
  it('pas de changement de camp → pas de renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(start, 1000)).toEqual([]);
    expect(d.update(start, 5000)).toEqual([]);
  });

  it('passage net → un seul renouvellement, une fois les camps stables depuis la fenêtre', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(moved, 1000)).toEqual([]);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS - 1)).toEqual([]);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS)).toEqual([{ index: 0, from: 'A', to: 'B' }]);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS + 16)).toEqual([]);
    expect(d.update(moved, 5000)).toEqual([]);
  });

  it('aller-retour rapide revenu aux camps étiquetés → aucun renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(moved, 1000)).toEqual([]);
    expect(d.update(start, 1100)).toEqual([]);
    expect(d.update(start, 1100 + RENEW_COOLDOWN_MS)).toEqual([]);
    expect(d.update(start, 5000)).toEqual([]);
  });

  it('oscillation qui finit dans l’autre camp → un seul renouvellement, après stabilisation', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(moved, 1000)).toEqual([]);
    expect(d.update(start, 1100)).toEqual([]);
    expect(d.update(moved, 1200)).toEqual([]);
    expect(d.update(moved, 1200 + RENEW_COOLDOWN_MS - 1)).toEqual([]);
    expect(d.update(moved, 1200 + RENEW_COOLDOWN_MS)).toEqual([{ index: 0, from: 'A', to: 'B' }]);
    expect(d.update(moved, 5000)).toEqual([]);
  });

  it('deux passages espacés → deux renouvellements', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    d.update(moved, 1000);
    expect(d.update(moved, 1000 + RENEW_COOLDOWN_MS)).toEqual([{ index: 0, from: 'A', to: 'B' }]);
    const both: Player[] = ['B', 'B', 'B', 'B'];
    d.update(both, 2000);
    expect(d.update(both, 2000 + RENEW_COOLDOWN_MS)).toEqual([{ index: 1, from: 'A', to: 'B' }]);
  });

  it('passages simultanés dans les deux sens → tous les palets concernés, avec leur camp de départ', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    const swapped: Player[] = ['B', 'A', 'A', 'B'];
    d.update(swapped, 1000);
    expect(d.update(swapped, 1000 + RENEW_COOLDOWN_MS)).toEqual([
      { index: 0, from: 'A', to: 'B' },
      { index: 2, from: 'B', to: 'A' },
    ]);
  });
});
