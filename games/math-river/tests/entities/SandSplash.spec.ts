import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@gambette/math-sdk';
import { createSandSplash, SAND_DRY } from '../../src/entities/SandSplash';
import { SAND_MS } from '../../src/config/water';
import { COLORS } from '../../src/config/theme';

const AT = { x: 400, y: 300 };

/** Composante la plus sombre d'une couleur : le sable mouillé est plus foncé que le sec. */
const lightness = (c: number): number => ((c >> 16) & 0xff) + ((c >> 8) & 0xff) + (c & 0xff);

/** Distance moyenne des grains au point d'impact. */
const spread = (s: ReturnType<typeof createSandSplash>): number => {
  const g = s.grains.particleChildren;
  return g.reduce((sum, p) => sum + Math.hypot(p.x, p.y), 0) / g.length;
};

describe('createSandSplash', () => {
  it('le sable sec est plus clair que le sable mouillé', () => {
    expect(lightness(SAND_DRY)).toBeGreaterThan(lightness(COLORS.wetSand));
  });

  it('à l’impact, les grains s’étalent autour du point puis ralentissent', () => {
    const s = createSandSplash(AT, true, mulberry32(1));
    expect(s.view.position).toMatchObject(AT);
    expect(s.grains.particleChildren.length).toBeGreaterThan(30);
    const d0 = spread(s);
    s.update(100);
    const d1 = spread(s);
    s.update(100);
    const d2 = spread(s);
    expect(d1).toBeGreaterThan(d0);
    expect(d2 - d1).toBeLessThan(d1 - d0);
  });

  it('dans l’eau : le sable sec se mouille, puis coule et disparaît en SAND_MS', () => {
    const s = createSandSplash(AT, true, mulberry32(1));
    expect(s.view.label).toBe('sand-in-water');
    const first = s.grains.particleChildren[0]!;
    const dry = lightness(first.tint);
    expect(s.update(SAND_MS / 2)).toBe(true);
    expect(lightness(first.tint)).toBeLessThan(dry);
    expect(s.update(SAND_MS / 2)).toBe(false);
    expect(s.view.alpha).toBe(0);
  });

  it('sur la plage : le sable reste sec et s’efface', () => {
    const s = createSandSplash(AT, false, mulberry32(1));
    expect(s.view.label).toBe('sand-on-beach');
    const first = s.grains.particleChildren[0]!;
    const dry = first.tint;
    s.update(SAND_MS / 2);
    expect(first.tint).toBe(dry);
    expect(s.update(SAND_MS)).toBe(false);
  });
});
