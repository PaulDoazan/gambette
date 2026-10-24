import { describe, it, expect, vi } from 'vitest';
import { createFish } from '../../src/entities/Fish';
import { PAN_MS, holeCenterOf } from '../../src/config/rounds';
import { SEA_SHORE_X } from '../../src/domain/channel';
import { DESIGN_WIDTH } from '../../src/config/dimensions';

describe('Fish', () => {
  it('nage dans le trou où on le place', () => {
    const fish = createFish();
    fish.swimIn(1);
    for (let t = 0; t < 1000; t += 16) fish.update(16, 0.5, 80);
    const p = fish.position();
    expect(Math.hypot(p.x - holeCenterOf(1).x, p.y - holeCenterOf(1).y)).toBeLessThan(80);
  });

  it('évasion : suit le canal jusqu’au trou suivant, sans jamais reculer, puis prévient une fois', () => {
    const fish = createFish();
    fish.swimIn(0);
    fish.update(16, 1, 120);
    const onOut = vi.fn();
    fish.escape(0, onOut);
    let lastX = -Infinity;
    for (let t = 0; t < PAN_MS + 50; t += 16) {
      fish.update(16, 1, 120);
      if (onOut.mock.calls.length === 0)
        expect(fish.position().x).toBeGreaterThanOrEqual(lastX - 0.01);
      lastX = fish.position().x;
    }
    expect(onOut).toHaveBeenCalledTimes(1);
    const p = fish.position();
    expect(Math.hypot(p.x - holeCenterOf(1).x, p.y - holeCenterOf(1).y)).toBeLessThan(60);
    for (let t = 0; t < 1000; t += 16) fish.update(16, 0.2, 60);
    expect(onOut).toHaveBeenCalledTimes(1);
  });

  it('depuis le dernier trou, le poisson rejoint la mer et y reste visible', () => {
    const fish = createFish();
    fish.swimIn(2);
    const onOut = vi.fn();
    fish.escape(2, onOut);
    for (let t = 0; t < PAN_MS + 50; t += 16) fish.update(16, 1, 120);
    expect(onOut).toHaveBeenCalledTimes(1);
    expect(fish.position().x).toBeGreaterThan(SEA_SHORE_X() + 20);
    expect(fish.position().x).toBeLessThan(3 * DESIGN_WIDTH - 20);
  });
});
