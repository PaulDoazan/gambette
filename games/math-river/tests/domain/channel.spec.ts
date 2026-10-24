import { describe, it, expect } from 'vitest';
import {
  channelCenter,
  channelHalfWidth,
  channelHeading,
  channelOutline,
} from '../../src/domain/channel';
import { CHANNEL_WIDTH, DESIGN_WIDTH, HOLE_RADIUS, MID_Y } from '../../src/config/dimensions';

describe('canal', () => {
  it('part du trou et sort au bord droit, à mi-hauteur aux deux bouts', () => {
    const start = channelCenter(0);
    expect(Math.hypot(start.x - DESIGN_WIDTH / 2, start.y - MID_Y)).toBeLessThan(HOLE_RADIUS);
    expect(channelCenter(1)).toEqual({ x: DESIGN_WIDTH, y: expect.closeTo(MID_Y, 6) });
  });

  it('sinueux : il s’écarte de la ligne médiane d’un côté puis de l’autre', () => {
    expect(channelCenter(0.3).y).toBeGreaterThan(MID_Y + 5);
    expect(channelCenter(0.75).y).toBeLessThan(MID_Y - 10);
  });

  it('sort du trou à l’horizontale, sans cassure', () => {
    expect(channelHeading(0.01)).toBeCloseTo(0, 1);
  });

  it('évasé au raccord avec le trou, de largeur régulière ensuite', () => {
    expect(channelHalfWidth(0)).toBeGreaterThan(CHANNEL_WIDTH);
    expect(channelHalfWidth(1)).toBeCloseTo(CHANNEL_WIDTH / 2);
    for (let t = 0.1; t <= 1; t += 0.1)
      expect(channelHalfWidth(t)).toBeLessThanOrEqual(channelHalfWidth(t - 0.1));
  });

  it('contour : un polygone fermé de points finis, tronqué à `upTo`', () => {
    const full = channelOutline(0);
    expect(full.length % 2).toBe(0);
    expect(full.every(Number.isFinite)).toBe(true);
    const half = channelOutline(0, 0.5);
    const maxX = Math.max(...half.filter((_, i) => i % 2 === 0));
    expect(maxX).toBeLessThan(DESIGN_WIDTH - 50);
  });
});

describe('raccord du canal au trou', () => {
  it('les berges partent du bord du trou, dans le sens de son contour', () => {
    const c = channelCenter(0);
    const w = channelHalfWidth(0);
    const bank = { x: c.x, y: c.y - w };
    const r = Math.hypot(bank.x - DESIGN_WIDTH / 2, bank.y - MID_Y);
    expect(Math.abs(r - HOLE_RADIUS)).toBeLessThan(8);
    // Pente de la berge au départ ≈ pente de la tangente au cercle en ce point.
    const next = { x: channelCenter(0.02).x, y: channelCenter(0.02).y - channelHalfWidth(0.02) };
    const bankAngle = Math.atan2(next.y - bank.y, next.x - bank.x);
    const radial = Math.atan2(bank.y - MID_Y, bank.x - DESIGN_WIDTH / 2);
    const tangent = radial + Math.PI / 2;
    expect(Math.abs(bankAngle - tangent)).toBeLessThan(0.35);
  });
});
