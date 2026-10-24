import { describe, it, expect } from 'vitest';
import { createAimGuide } from '../../src/entities/AimGuide';
import { aimFrom, holeCenter } from '../../src/domain/aim';
import { MAX_RANGE, MAX_STRETCH } from '../../src/config/dimensions';

const HOME = { x: 360, y: 1100 };
const gripToward = (target: { x: number; y: number }) => {
  const dx = target.x - HOME.x;
  const dy = target.y - HOME.y;
  const r = Math.hypot(dx, dy);
  const st = (r / MAX_RANGE) * MAX_STRETCH;
  return { x: HOME.x - (dx / r) * st, y: HOME.y - (dy / r) * st };
};

describe('AimGuide', () => {
  it('onTarget : vrai si l’eau tomberait dans le trou, faux à côté ou une fois masquée', () => {
    const g = createAimGuide();
    const inside = gripToward(holeCenter());
    g.show(HOME, inside, aimFrom(HOME, inside));
    expect(g.onTarget()).toBe(true);
    const c = holeCenter();
    const outside = gripToward({ x: c.x - 300, y: c.y + 260 });
    g.show(HOME, outside, aimFrom(HOME, outside));
    expect(g.onTarget()).toBe(false);
    g.show(HOME, inside, aimFrom(HOME, inside));
    g.hide();
    expect(g.onTarget()).toBe(false);
  });

  it('étirement trop faible (pas de tir) → onTarget faux', () => {
    const g = createAimGuide();
    g.show(HOME, { x: HOME.x, y: HOME.y + 5 }, null);
    expect(g.onTarget()).toBe(false);
  });
});
