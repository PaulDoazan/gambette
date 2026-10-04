import { describe, it, expect, vi } from 'vitest';
import type { GameContext, GameInstance, GameModule } from '@gambette/game-sdk';
import { startGame } from '../lib/mountGame';

const ctx: GameContext = { locale: 'fr', onExit: () => {} };
const flush = () => new Promise((r) => setTimeout(r, 0));

function deferredModule() {
  let resolve!: (i: GameInstance) => void;
  let reject!: (e: unknown) => void;
  const instance = { unmount: vi.fn() };
  const module: GameModule = {
    meta: { key: 'k', name: 'k', description: '', instructions: '' },
    mount: vi.fn(
      () =>
        new Promise<GameInstance>((res, rej) => {
          resolve = res;
          reject = rej;
        }),
    ),
  };
  return { module, instance, resolve: () => resolve(instance), reject: (e: unknown) => reject(e) };
}

describe('startGame', () => {
  it('monte puis signale ready ; stop démonte', async () => {
    const d = deferredModule();
    const onReady = vi.fn();
    const g = startGame(d.module, document.createElement('div'), ctx, {
      onReady,
      onError: vi.fn(),
    });
    d.resolve();
    await flush();
    expect(onReady).toHaveBeenCalledTimes(1);
    g.stop();
    expect(d.instance.unmount).toHaveBeenCalledTimes(1);
  });

  it('stop avant résolution : démonte dès que mount résout, sans ready', async () => {
    const d = deferredModule();
    const onReady = vi.fn();
    const g = startGame(d.module, document.createElement('div'), ctx, {
      onReady,
      onError: vi.fn(),
    });
    g.stop();
    d.resolve();
    await flush();
    expect(d.instance.unmount).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('erreur de mount → onError, pas de ready', async () => {
    const d = deferredModule();
    const onReady = vi.fn();
    const onError = vi.fn();
    startGame(d.module, document.createElement('div'), ctx, { onReady, onError });
    d.reject(new Error('boom'));
    await flush();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onReady).not.toHaveBeenCalled();
  });

  it('mount synchrone qui lève → onError', async () => {
    const module: GameModule = {
      meta: { key: 'k', name: 'k', description: '', instructions: '' },
      mount: () => {
        throw new Error('sync');
      },
    };
    const onError = vi.fn();
    startGame(module, document.createElement('div'), ctx, { onReady: vi.fn(), onError });
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
