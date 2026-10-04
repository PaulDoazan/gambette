// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { runStandalone } from '../src/standalone';
import type { GameModule, GameContext } from '../src/types';

function captureModule(async = false): {
  module: GameModule;
  lastCtx: () => GameContext | null;
  lastEl: () => HTMLElement | null;
} {
  let ctx: GameContext | null = null;
  let el: HTMLElement | null = null;
  const module: GameModule = {
    meta: { key: 'cap', name: 'cap', description: '', instructions: '' },
    mount: (e, c) => {
      ctx = c;
      el = e;
      const instance = { unmount: vi.fn() };
      return async ? Promise.resolve(instance) : instance;
    },
  };
  return { module, lastCtx: () => ctx, lastEl: () => el };
}

describe('runStandalone', () => {
  it('monte avec un contexte fr et des callbacks sûrs', async () => {
    const { module, lastCtx } = captureModule();
    await runStandalone(module);
    const ctx = lastCtx()!;
    expect(ctx.locale).toBe('fr');
    expect(() => ctx.onExit()).not.toThrow();
    expect(() => ctx.onScore?.(1)).not.toThrow();
    expect(() => ctx.onGameOver?.({ score: 1 })).not.toThrow();
  });

  it('monte dans le container fourni (body par défaut)', async () => {
    const a = captureModule();
    await runStandalone(a.module);
    expect(a.lastEl()).toBe(document.body);
    const b = captureModule();
    const el = document.createElement('div');
    await runStandalone(b.module, { container: el });
    expect(b.lastEl()).toBe(el);
  });

  it('résout l’instance pour un mount synchrone ou asynchrone', async () => {
    const sync = await runStandalone(captureModule(false).module);
    const asyncI = await runStandalone(captureModule(true).module);
    expect(typeof sync.unmount).toBe('function');
    expect(typeof asyncI.unmount).toBe('function');
  });
});
