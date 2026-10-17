import { describe, it, expect } from 'vitest';
import { createCalcBlock } from '../../src/entities/CalcBlock';
import { CALC_BLOCK } from '../../src/config/dimensions';

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
});
