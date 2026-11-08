import { describe, it, expect } from 'vitest';
import { createWaterRun } from '../../src/entities/WaterRun';

describe('WaterRun', () => {
  it('l’eau avance le long du chemin, sans dépasser son bout ni reculer sous zéro', () => {
    const run = createWaterRun(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
      ],
      24,
    );
    expect(run.length).toBe(150);
    run.setRushing(true);
    run.setFront(60);
    run.update(16);
    expect(run.front()).toBe(60);
    run.setFront(500);
    expect(run.front()).toBe(150);
    run.setFront(-5);
    expect(run.front()).toBe(0);
  });
});
