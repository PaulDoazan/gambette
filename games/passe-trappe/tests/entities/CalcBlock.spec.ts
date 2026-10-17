import { describe, it, expect } from 'vitest';
import { createCalcBlock } from '../../src/entities/CalcBlock';
import { CALC_BLOCK } from '../../src/config/dimensions';
import { BURST_MS } from '../../src/entities/Burst';

describe('CalcBlock', () => {
  it('affiche « a × b = ? » et se place pour son joueur', () => {
    const a = createCalcBlock('A');
    a.setPair({ a: 6, b: 8, op: 'mul' });
    expect(a.text()).toBe('6 × 8 = ?');
    expect(a.view.position.x).toBe(CALC_BLOCK.A.x);
    expect(a.view.rotation).toBe(0);
    const b = createCalcBlock('B');
    b.setPair({ a: 9, b: 3, op: 'sub' });
    expect(b.text()).toBe('9 − 3 = ?');
    expect(b.view.rotation).toBeCloseTo(Math.PI, 6);
  });

  it('positions : A à droite sous la cloison, B à gauche au-dessus, dans le plateau', () => {
    expect(CALC_BLOCK.A.x).toBeGreaterThan(360);
    expect(CALC_BLOCK.B.x).toBeLessThan(360);
    expect(CALC_BLOCK.A.y).toBeGreaterThan(640);
    expect(CALC_BLOCK.B.y).toBeLessThan(640);
  });

  it('flash() : le bloc rebondit puis revient à la normale', () => {
    const a = createCalcBlock('A');
    a.setPair({ a: 6, b: 8, op: 'mul' });
    a.flash();
    expect(a.isFlashing()).toBe(true);
    a.update(BURST_MS * 0.25);
    expect(a.view.scale.x).toBeGreaterThan(1.05);
    expect(a.sparks.visible).toBe(true);
    expect(a.sparks.position.x).toBe(a.view.position.x);
    a.update(BURST_MS);
    expect(a.sparks.visible).toBe(false);
    expect(a.isFlashing()).toBe(false);
    expect(a.view.scale.x).toBe(1);
  });
});
