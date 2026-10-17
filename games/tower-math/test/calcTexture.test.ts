import { describe, it, expect, vi } from 'vitest';
import { createCalcTexture, drawCalcLabel, pickLabelFace } from '../src/calcTexture';

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
    drawCalcLabel(ctx as unknown as CanvasRenderingContext2D, '6 × 7 = 42', 384, 128);
    expect(ctx.fillText).toHaveBeenCalledWith('6 × 7 = 42', 192, 64);
  });

  it('réduit la police pour un libellé long (reste dans la face)', () => {
    const short = fakeCtx();
    drawCalcLabel(short as unknown as CanvasRenderingContext2D, '2 + 3 = 5', 128, 128);
    const long = fakeCtx();
    drawCalcLabel(long as unknown as CanvasRenderingContext2D, '10 × 10 = 100', 128, 128);
    expect(long.fontPx()).toBeLessThan(short.fontPx());
    expect(long.measureText('10 × 10 = 100').width).toBeLessThanOrEqual(128 * 0.9);
  });
});

describe('createCalcTexture', () => {
  it('épouse les proportions de la face latérale, texte droit (pas de rotation)', () => {
    // jsdom n'implémente pas le canvas 2D : texture vierge, sans erreur.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const tex = createCalcTexture('6 × 7 = 42', 3);
    const img = tex.image as HTMLCanvasElement;
    expect(img.width / img.height).toBeCloseTo(3);
    expect(tex.rotation).toBe(0);
    tex.dispose();
    vi.restoreAllMocks();
  });
});

describe('pickLabelFace', () => {
  // Caméra en (6,6,6) : faces latérales visibles = +x (index 0) et +z (index 4).
  it('choisit +x quand la profondeur est la plus grande', () => {
    expect(pickLabelFace(1.2, 3)).toEqual({ index: 0, length: 3 });
  });

  it('choisit +z quand la largeur est la plus grande (ou égale)', () => {
    expect(pickLabelFace(3, 0.8)).toEqual({ index: 4, length: 3 });
    expect(pickLabelFace(2, 2)).toEqual({ index: 4, length: 2 });
  });
});
