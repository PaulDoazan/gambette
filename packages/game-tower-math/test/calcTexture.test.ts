import { describe, it, expect, vi } from 'vitest';
import { createCalcTexture, createLabelCache, drawCalcLabel } from '../src/calcTexture';

// Contexte 2D factice : la largeur mesurée est proportionnelle à la taille de police.
function fakeCtx() {
  let fontPx = 0;
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((s: string) => ({ width: s.length * fontPx * 0.6 })),
    set font(v: string) {
      fontPx = Number(/(\d+)px/.exec(v)?.[1] ?? 0);
    },
    get font() {
      return `${fontPx}px`;
    },
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    fontPx: () => fontPx,
  };
}

describe('drawCalcLabel', () => {
  it('dessine le libellé centré', () => {
    const ctx = fakeCtx();
    drawCalcLabel(ctx as unknown as CanvasRenderingContext2D, '6 × 7 = 42');
    expect(ctx.fillText).toHaveBeenCalledWith('6 × 7 = 42', 128, 128);
  });

  it('réduit la police pour un libellé long (reste dans la face)', () => {
    const short = fakeCtx();
    drawCalcLabel(short as unknown as CanvasRenderingContext2D, '2 + 3 = 5');
    const long = fakeCtx();
    drawCalcLabel(long as unknown as CanvasRenderingContext2D, '10 × 10 = 100');
    expect(long.fontPx()).toBeLessThan(short.fontPx());
    expect(long.measureText('10 × 10 = 100').width).toBeLessThanOrEqual(256 * 0.9);
  });
});

describe('createCalcTexture', () => {
  it('produit une texture redressée pour la caméra iso (45°)', () => {
    // jsdom n'implémente pas le canvas 2D : texture vierge, sans erreur.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const tex = createCalcTexture('6 × 7 = 42');
    expect(tex.rotation).toBeCloseTo(Math.PI / 4);
    expect(tex.center.x).toBe(0.5);
    tex.dispose();
    vi.restoreAllMocks();
  });
});

describe('createLabelCache', () => {
  it('renvoie la même instance par libellé et libère tout au dispose', () => {
    const create = vi.fn(() => ({ dispose: vi.fn() }));
    const cache = createLabelCache(create);
    const a = cache.get('6 × 7 = 42');
    expect(cache.get('6 × 7 = 42')).toBe(a);
    cache.get('3 + 4 = 7');
    expect(create).toHaveBeenCalledTimes(2);
    cache.dispose();
    expect(a.dispose).toHaveBeenCalledTimes(1);
  });
});
