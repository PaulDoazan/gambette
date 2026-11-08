import { describe, it, expect, vi } from 'vitest';
import { createFish } from '../../src/entities/Fish';

describe('Fish', () => {
  it('tourne dans sa mare', () => {
    const fish = createFish({ x: 150, y: 1080 });
    for (let i = 0; i < 20; i++) fish.update(50);
    const p = fish.position();
    expect(Math.hypot(p.x - 150, p.y - 1080)).toBeLessThan(40);
  });

  it('suit un chemin jusqu’au bout, puis prévient une seule fois', () => {
    const fish = createFish({ x: 0, y: 0 });
    const done = vi.fn();
    fish.follow(
      [
        { x: 300, y: 0 },
        { x: 300, y: 200 },
      ],
      1000,
      done,
    );
    expect(fish.travelling()).toBe(true);
    for (let i = 0; i < 20; i++) fish.update(50);
    expect(done).toHaveBeenCalledTimes(1);
    expect(fish.travelling()).toBe(false);
    expect(fish.position()).toEqual({ x: 300, y: 200 });
    // Puis il reste au bout du chemin, sans revenir à son ancienne mare.
    for (let i = 0; i < 20; i++) fish.update(50);
    expect(done).toHaveBeenCalledTimes(1);
    expect(Math.hypot(fish.position().x - 300, fish.position().y - 200)).toBeLessThan(40);
  });
});
