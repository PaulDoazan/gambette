import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import type { GameContext } from '@gambette/game-sdk';

interface FakeApp {
  destroy: ReturnType<typeof vi.fn>;
  ticker: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  canvas: HTMLCanvasElement;
}
const { fakeApps } = vi.hoisted(() => ({ fakeApps: [] as FakeApp[] }));
vi.mock('../src/core/App', () => ({
  createApp: vi.fn(async (parent: HTMLElement) => {
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    const app = {
      stage: new Container(),
      canvas,
      ticker: { add: vi.fn(), remove: vi.fn() },
      destroy: vi.fn(() => canvas.remove()),
    };
    fakeApps.push(app);
    return app;
  }),
}));

const { passeTrappe } = await import('../src/index');
const ctx = (): GameContext => ({ locale: 'fr', onExit: vi.fn() });

beforeEach(() => {
  fakeApps.length = 0;
  document.body.innerHTML = '';
});

describe('passeTrappe.mount / unmount', () => {
  it('meta passe-trappe avec consigne', () => {
    expect(passeTrappe.meta.key).toBe('passe-trappe');
    expect(passeTrappe.meta.instructions).not.toBe('');
  });

  it('monte canvas + bouton quitter latéral ; unmount vide el', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    expect(el.querySelector('canvas')).not.toBeNull();
    const exit = el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;
    expect(exit.style.left).toBe('12px');
    instance.unmount();
    expect(el.children).toHaveLength(0);
    const app = fakeApps[0]!;
    expect(app.destroy).toHaveBeenCalled();
    expect(app.ticker.remove).toHaveBeenCalledWith(app.ticker.add.mock.calls[0]![0]);
  });

  it('Quitter (après confirmation) appelle ctx.onExit', async () => {
    const el = document.createElement('div');
    const c = ctx();
    const instance = await passeTrappe.mount(el, c);
    el.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    el.querySelector<HTMLButtonElement>('[data-test="game-exit-go"]')!.click();
    expect(c.onExit).toHaveBeenCalledTimes(1);
    instance.unmount();
  });

  it('deux cycles mount/unmount sans écouteur window résiduel', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    for (let i = 0; i < 2; i++) (await passeTrappe.mount(el, ctx())).unmount();
    const added = add.mock.calls.filter((c) =>
      ['resize', 'orientationchange'].includes(c[0] as string),
    );
    for (const [type, handler] of added) expect(remove).toHaveBeenCalledWith(type, handler);
    expect(el.children).toHaveLength(0);
    add.mockRestore();
    remove.mockRestore();
  });
});
