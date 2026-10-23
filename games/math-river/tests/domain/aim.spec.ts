import { describe, it, expect } from 'vitest';
import { aimFrom, clampGrip, flightAt, holeCenter, inHole } from '../../src/domain/aim';
import {
  DESIGN_WIDTH,
  HOLE_RADIUS,
  MAX_RANGE,
  MAX_STRETCH,
  MIN_STRETCH,
} from '../../src/config/dimensions';

const HOME = { x: 360, y: 1100 };

describe('aimFrom', () => {
  it('pas de tir sous le seuil d’étirement', () => {
    expect(aimFrom(HOME, { x: HOME.x, y: HOME.y + MIN_STRETCH - 1 })).toBeNull();
  });

  it('tirer vers soi vise droit devant, à l’opposé de la traction', () => {
    const aim = aimFrom(HOME, { x: HOME.x, y: HOME.y + 75 })!;
    expect(aim.target.x).toBeCloseTo(HOME.x);
    expect(aim.target.y).toBeLessThan(HOME.y);
  });

  it('tirer de côté vise en diagonale, de l’autre côté', () => {
    const aim = aimFrom(HOME, { x: HOME.x + 50, y: HOME.y + 50 })!;
    expect(aim.target.x).toBeLessThan(HOME.x);
    expect(aim.target.y).toBeLessThan(HOME.y);
  });

  it('portée proportionnelle à l’étirement, plafonnée', () => {
    const half = aimFrom(HOME, { x: HOME.x, y: HOME.y + MAX_STRETCH / 2 })!;
    expect(half.range).toBeCloseTo(MAX_RANGE / 2);
    const over = aimFrom(HOME, { x: HOME.x, y: HOME.y + MAX_STRETCH * 3 })!;
    expect(over.stretch).toBe(MAX_STRETCH);
    expect(over.range).toBeCloseTo(MAX_RANGE);
  });

  it('le joueur du haut vise vers le bas en tirant vers le haut', () => {
    const top = { x: 360, y: 180 };
    const aim = aimFrom(top, { x: top.x, y: top.y - 80 })!;
    expect(aim.target.y).toBeGreaterThan(top.y);
  });
});

describe('clampGrip', () => {
  it('le seau reste à au plus MAX_STRETCH de sa place', () => {
    const g = clampGrip(HOME, { x: HOME.x, y: HOME.y + 500 });
    expect(Math.hypot(g.x - HOME.x, g.y - HOME.y)).toBeCloseTo(MAX_STRETCH);
  });

  it('le seau reste dans le plateau', () => {
    const g = clampGrip({ x: 40, y: 600 }, { x: -200, y: 600 });
    expect(g.x).toBe(0);
    expect(clampGrip({ x: DESIGN_WIDTH - 10, y: 600 }, { x: 900, y: 600 }).x).toBe(DESIGN_WIDTH);
  });
});

describe('flightAt', () => {
  const to = { x: 360, y: 640 };
  it('au sol aux extrémités, au plus haut à mi-course', () => {
    expect(flightAt(HOME, to, 0)).toMatchObject({ x: HOME.x, y: HOME.y, lift: 0 });
    expect(flightAt(HOME, to, 1).lift).toBeCloseTo(0);
    expect(flightAt(HOME, to, 1)).toMatchObject({ x: to.x, y: to.y });
    expect(flightAt(HOME, to, 0.5).lift).toBeCloseTo(1);
  });
});

describe('inHole', () => {
  it('dedans, sur le bord, dehors', () => {
    const c = holeCenter();
    expect(inHole(c)).toBe(true);
    expect(inHole({ x: c.x + HOLE_RADIUS, y: c.y })).toBe(true);
    expect(inHole({ x: c.x, y: c.y + HOLE_RADIUS + 1 })).toBe(false);
  });

  it('un tir moyen depuis la rangée de A tombe dans le trou', () => {
    const c = holeCenter();
    const stretch = ((HOME.y - c.y) / MAX_RANGE) * MAX_STRETCH;
    const aim = aimFrom(HOME, { x: HOME.x, y: HOME.y + stretch })!;
    expect(inHole(aim.target)).toBe(true);
  });
});
