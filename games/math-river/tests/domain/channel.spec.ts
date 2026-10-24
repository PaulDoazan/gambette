import { describe, it, expect } from 'vitest';
import { SEA_SHORE_X, channelBoundaryT, channelFrom } from '../../src/domain/channel';
import { ROUNDS, holeCenterOf } from '../../src/config/rounds';
import { CHANNEL_WIDTH, DESIGN_WIDTH, MID_Y } from '../../src/config/dimensions';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('canal entre deux trous', () => {
  for (const k of [0, 1] as const) {
    const ch = channelFrom(k);

    it(`canal ${k} → ${k + 1} : part du trou ${k} et arrive dans le trou ${k + 1}`, () => {
      expect(dist(ch.center(0), holeCenterOf(k))).toBeLessThan(ROUNDS[k]!.holeRadius);
      expect(dist(ch.center(1), holeCenterOf(k + 1))).toBeLessThan(ROUNDS[k + 1]!.holeRadius);
    });

    it(`canal ${k} → ${k + 1} : horizontal à mi-hauteur à la frontière des deux écrans`, () => {
      const t = channelBoundaryT(k);
      const c = ch.center(t);
      expect(c.x).toBeCloseTo((k + 1) * DESIGN_WIDTH);
      expect(c.y).toBeCloseTo(MID_Y);
      expect(Math.abs(ch.heading(t))).toBeLessThan(0.02);
    });

    it(`canal ${k} → ${k + 1} : sinueux sur chaque écran`, () => {
      const t = channelBoundaryT(k);
      const dev = (a: number, b: number): number => {
        let m = 0;
        for (let s = a; s <= b; s += 0.01) m = Math.max(m, Math.abs(ch.center(s).y - MID_Y));
        return m;
      };
      expect(dev(0, t)).toBeGreaterThan(15);
      expect(dev(t, 1)).toBeGreaterThan(15);
    });

    it(`canal ${k} → ${k + 1} : sort et entre dans les trous à l’horizontale`, () => {
      expect(Math.abs(ch.heading(0.01))).toBeLessThan(0.1);
      expect(Math.abs(ch.heading(0.99))).toBeLessThan(0.1);
    });

    it(`canal ${k} → ${k + 1} : évasé aux deux raccords, régulier entre les deux`, () => {
      expect(ch.halfWidth(0)).toBeGreaterThan(CHANNEL_WIDTH);
      expect(ch.halfWidth(1)).toBeGreaterThan(CHANNEL_WIDTH);
      expect(ch.halfWidth(channelBoundaryT(k))).toBeCloseTo(CHANNEL_WIDTH / 2, 0);
    });

    it(`canal ${k} → ${k + 1} : les berges partent des bords des trous, dans le sens du contour`, () => {
      for (const [t, dt, hole] of [
        [0, 0.02, k],
        [1, -0.02, k + 1],
      ] as const) {
        const centre = holeCenterOf(hole);
        const bankAt = (s: number) => ({ x: ch.center(s).x, y: ch.center(s).y - ch.halfWidth(s) });
        const bank = bankAt(t);
        expect(Math.abs(dist(bank, centre) - ROUNDS[hole]!.holeRadius)).toBeLessThan(8);
        const next = bankAt(t + dt);
        const along = Math.atan2(next.y - bank.y, next.x - bank.x);
        const radial = Math.atan2(bank.y - centre.y, bank.x - centre.x);
        const tangent = radial + (dt > 0 ? Math.PI / 2 : -Math.PI / 2);
        const diff = Math.atan2(Math.sin(along - tangent), Math.cos(along - tangent));
        expect(Math.abs(diff)).toBeLessThan(0.35);
      }
    });
  }

  it('contour : un polygone fermé de points finis, tronqué à [from, to]', () => {
    const ch = channelFrom(0);
    const full = ch.outline(0);
    expect(full.length % 2).toBe(0);
    expect(full.every(Number.isFinite)).toBe(true);
    const half = ch.outline(0, 0, channelBoundaryT(0) / 2);
    expect(Math.max(...half.filter((_, i) => i % 2 === 0))).toBeLessThan(DESIGN_WIDTH - 20);
  });
});

describe('canal vers la mer', () => {
  it('part du dernier trou et se jette dans la mer', () => {
    const ch = channelFrom(2);
    expect(dist(ch.center(0), holeCenterOf(2))).toBeLessThan(ROUNDS[2]!.holeRadius);
    expect(ch.center(1).x).toBeGreaterThan(SEA_SHORE_X());
    expect(SEA_SHORE_X()).toBeLessThan(3 * DESIGN_WIDTH);
  });
});
