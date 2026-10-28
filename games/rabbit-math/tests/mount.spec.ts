import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import type { GameContext } from '@gambette/game-sdk';

// Pixi Application exige WebGL/Canvas, absent de jsdom : on simule l'app et le préchargement.
interface FakeApp {
  stage: Container;
  destroy: ReturnType<typeof vi.fn>;
  ticker: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  canvas: HTMLCanvasElement;
}
// vi.hoisted : la factory de vi.mock est remontée en tête de fichier.
const { fakeApps } = vi.hoisted(() => ({ fakeApps: [] as FakeApp[] }));
vi.mock('../src/core/App', () => ({
  createApp: vi.fn(async (parent: HTMLElement) => {
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    const app = {
      stage: new Container(),
      canvas,
      logical: { width: 1, height: 1 },
      ticker: { add: vi.fn(), remove: vi.fn() },
      resize: () => {},
      destroy: vi.fn(() => canvas.remove()),
    };
    fakeApps.push(app);
    return app;
  }),
}));
const { settingsFault } = vi.hoisted(() => ({ settingsFault: { error: null as Error | null } }));
vi.mock('../src/services/Settings', async (orig) => {
  const actual = await orig<typeof import('../src/services/Settings')>();
  return {
    ...actual,
    loadSettings: () => {
      if (settingsFault.error) throw settingsFault.error;
      return actual.loadSettings();
    },
  };
});
vi.mock('../src/assets', async (orig) => ({
  ...(await orig<typeof import('../src/assets')>()),
  preloadAssets: vi.fn(async () => {}),
}));

const { rabbitMath } = await import('../src/index');

const ctx = (): GameContext => ({ locale: 'fr', onExit: vi.fn() });

beforeEach(() => {
  fakeApps.length = 0;
  settingsFault.error = null;
  document.body.innerHTML = '';
});

describe('rabbitMath.mount / unmount', () => {
  it('expose la meta rabbit-math', () => {
    expect(rabbitMath.meta.key).toBe('rabbit-math');
    expect(rabbitMath.meta.instructions).not.toBe('');
  });

  it('monte canvas + bouton quitter, unmount laisse el vide', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const instance = await rabbitMath.mount(el, ctx());
    expect(el.querySelector('canvas')).not.toBeNull();
    expect(el.querySelector('[data-test="game-exit"]')).not.toBeNull();
    instance.unmount();
    expect(el.children).toHaveLength(0);
    const app = fakeApps[0]!;
    expect(app.destroy).toHaveBeenCalled();
    expect(app.ticker.remove).toHaveBeenCalledWith(app.ticker.add.mock.calls[0]![0]);
  });

  it('le bouton quitter appelle ctx.onExit après confirmation', async () => {
    const el = document.createElement('div');
    const c = ctx();
    const instance = await rabbitMath.mount(el, c);
    el.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    el.querySelector<HTMLButtonElement>('[data-test="game-exit-go"]')!.click();
    expect(c.onExit).toHaveBeenCalledTimes(1);
    instance.unmount();
  });

  it('colonne de boutons ronds : quitter, puis l’engrenage', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const instance = await rabbitMath.mount(el, ctx());
    const tests = [...el.querySelectorAll<HTMLButtonElement>('button')]
      .filter((b) => b.offsetParent !== undefined)
      .map((b) => b.dataset.test);
    expect(tests).toContain('game-exit');
    expect(tests).toContain('rabbit-math-settings');
    const exit = el.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!;
    const gear = el.querySelector<HTMLButtonElement>('[data-test="rabbit-math-settings"]')!;
    expect(exit.getAttribute('aria-label')).toBe('Quitter');
    expect(gear.style.borderRadius).toBe(exit.style.borderRadius);
    expect(gear.style.width).toBe(exit.style.width);
    instance.unmount();
  });

  it('panneau calé sur le bord gauche du jeu, un peu sous son haut, suit le redimensionnement', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const rect = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 900, 560));
    const instance = await rabbitMath.mount(el, ctx());
    const canvas = el.querySelector('canvas')!;
    const box = vi.spyOn(canvas, 'getBoundingClientRect');
    box.mockReturnValue(rect(28, 72, 844, 400));
    window.dispatchEvent(new Event('resize'));
    const band = el.querySelector<HTMLElement>('[data-test="rabbit-math-buttons"]')!;
    expect(band.style.left).toBe('28px');
    expect(band.style.top).toBe(`${72 + 400 * 0.15}px`);
    box.mockReturnValue(rect(0, 0, 900, 416));
    window.dispatchEvent(new Event('resize'));
    expect(band.style.top).toBe(`${416 * 0.15}px`);
    instance.unmount();
  });

  it('l’engrenage ouvre les réglages et masque les boutons', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const instance = await rabbitMath.mount(el, ctx());
    const stage = fakeApps[0]!.stage as Container;
    el.querySelector<HTMLButtonElement>('[data-test="rabbit-math-settings"]')!.click();
    expect(stage.getChildByLabel('settings', true)).not.toBeNull();
    const band = el.querySelector<HTMLElement>('[data-test="rabbit-math-buttons"]')!;
    expect(band.style.display).toBe('none');
    instance.unmount();
  });

  it('deux cycles mount/unmount ne laissent aucun écouteur window', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    for (let i = 0; i < 2; i++) (await rabbitMath.mount(el, ctx())).unmount();
    const added = add.mock.calls.filter((c) => c[0] === 'resize' || c[0] === 'orientationchange');
    for (const [type, handler] of added) expect(remove).toHaveBeenCalledWith(type, handler);
    expect(el.children).toHaveLength(0);
    add.mockRestore();
    remove.mockRestore();
  });

  it('unmount retire un sélecteur de calculs resté ouvert', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const instance = await rabbitMath.mount(el, ctx());
    const { openCalcsPicker } = await import('@gambette/math-sdk');
    void openCalcsPicker({ initial: [{ a: 2, b: 3, op: 'mul' }], container: el });
    instance.unmount();
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });

  it('détruit l’app puis relance l’erreur si le montage échoue après createApp', async () => {
    settingsFault.error = new Error('réglages illisibles');
    const el = document.createElement('div');
    document.body.appendChild(el);
    await expect(rabbitMath.mount(el, ctx())).rejects.toThrow('réglages illisibles');
    expect(fakeApps).toHaveLength(1);
    expect(fakeApps[0]!.destroy).toHaveBeenCalled();
    expect(el.children).toHaveLength(0);
  });
});
