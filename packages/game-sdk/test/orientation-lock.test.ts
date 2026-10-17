// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { installOrientationLock } from '../src/orientation-lock';

const setViewport = (w: number, h: number): void => {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
};

afterEach(() => vi.restoreAllMocks());

describe('installOrientationLock', () => {
  it('paysage requis : overlay visible en portrait, masqué en paysage', () => {
    const parent = document.createElement('div');
    setViewport(400, 800);
    const dispose = installOrientationLock(parent, 'landscape');
    const overlay = parent.firstElementChild as HTMLElement;
    expect(overlay.style.display).toBe('flex');
    setViewport(800, 400);
    window.dispatchEvent(new Event('resize'));
    expect(overlay.style.display).toBe('none');
    dispose();
  });

  it('portrait requis : overlay visible en paysage, masqué en portrait', () => {
    const parent = document.createElement('div');
    setViewport(800, 400);
    const dispose = installOrientationLock(parent, 'portrait');
    const overlay = parent.firstElementChild as HTMLElement;
    expect(overlay.style.display).toBe('flex');
    expect(overlay.textContent).toContain('verticale');
    setViewport(400, 800);
    window.dispatchEvent(new Event('orientationchange'));
    expect(overlay.style.display).toBe('none');
    dispose();
  });

  it('dispose retire l’overlay et ses écouteurs', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const parent = document.createElement('div');
    const dispose = installOrientationLock(parent, 'landscape');
    dispose();
    expect(parent.children).toHaveLength(0);
    for (const type of ['resize', 'orientationchange']) {
      const handler = add.mock.calls.find((c) => c[0] === type)![1];
      expect(remove).toHaveBeenCalledWith(type, handler);
    }
  });
});
