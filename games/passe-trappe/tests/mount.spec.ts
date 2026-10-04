import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container, type FederatedPointerEvent } from 'pixi.js';
import type { GameContext } from '@gambette/game-sdk';
import type { Player } from '../src/domain/types';

interface FakeApp {
  stage: Container;
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

// Échec simulé de l'installation du verrou d'orientation (étape postérieure à createApp).
const { lockState } = vi.hoisted(() => ({ lockState: { fail: false } }));
vi.mock('@gambette/game-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gambette/game-sdk')>();
  return {
    ...actual,
    installOrientationLock: (...args: Parameters<typeof actual.installOrientationLock>) => {
      if (lockState.fail) throw new Error('verrou impossible');
      return actual.installOrientationLock(...args);
    },
  };
});

// Scène de jeu simulée : permet de déclencher une victoire sans piloter la physique.
interface FakeScene {
  view: Container;
  drag: Record<'pointerDown' | 'pointerMove' | 'pointerUp', ReturnType<typeof vi.fn>>;
  tick: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  win(player: Player): void;
}
const { fakeScenes } = vi.hoisted(() => ({ fakeScenes: [] as unknown[] }));
vi.mock('../src/scenes/GameScene', () => ({
  createGameScene: vi.fn((deps: { onWin(player: Player): void }) => {
    const scene = {
      view: new Container(),
      drag: { pointerDown: vi.fn(), pointerMove: vi.fn(), pointerUp: vi.fn() },
      tick: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
      win: (player: Player) => deps.onWin(player),
    };
    fakeScenes.push(scene);
    return scene;
  }),
}));

const { passeTrappe } = await import('../src/index');
const ctx = (): GameContext => ({ locale: 'fr', onExit: vi.fn() });

beforeEach(() => {
  fakeApps.length = 0;
  fakeScenes.length = 0;
  lockState.fail = false;
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

describe('passeTrappe.mount — échec de montage', () => {
  it('nettoie tout et rejette si une étape après createApp échoue', async () => {
    lockState.fail = true;
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    await expect(passeTrappe.mount(el, ctx())).rejects.toThrow('verrou impossible');
    expect(el.children).toHaveLength(0);
    expect(fakeApps[0]!.destroy).toHaveBeenCalledTimes(1);
    expect((fakeScenes[0] as FakeScene).destroy).toHaveBeenCalledTimes(1);
    for (const [type, handler] of add.mock.calls)
      expect(remove).toHaveBeenCalledWith(type, handler);
    add.mockRestore();
    remove.mockRestore();
  });
});

describe('passeTrappe.mount — cycle de victoire', () => {
  const touch = (stage: Container, pointerId: number): void => {
    stage.emit('pointerdown', {
      pointerId,
      getLocalPosition: () => ({ x: 360, y: 900 }),
    } as unknown as FederatedPointerEvent);
  };
  const exitWrap = (el: HTMLElement): HTMLElement =>
    el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;

  it('victoire → entrée bloquée, bouton quitter masqué ; Rejouer → tout revient ; 2e victoire', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    const app = fakeApps[0]!;
    const scene = fakeScenes[0] as FakeScene;
    const stage = app.stage;
    const tick = app.ticker.add.mock.calls[0]![0] as (t: { deltaMS: number }) => void;
    const replay = (): void => {
      stage.getChildByLabel('replay', true)!.emit('pointertap', {} as FederatedPointerEvent);
    };

    touch(stage, 1);
    expect(scene.drag.pointerDown).toHaveBeenCalledTimes(1);

    scene.win('A');
    expect(stage.getChildByLabel('replay', true)).not.toBeNull();
    expect(exitWrap(el).style.display).toBe('none');
    touch(stage, 2);
    expect(scene.drag.pointerDown).toHaveBeenCalledTimes(1);
    tick({ deltaMS: 16 });
    expect(scene.tick).not.toHaveBeenCalled();

    replay();
    expect(scene.reset).toHaveBeenCalledTimes(1);
    expect(stage.getChildByLabel('replay', true)).toBeNull();
    expect(exitWrap(el).style.display).not.toBe('none');
    touch(stage, 3);
    expect(scene.drag.pointerDown).toHaveBeenCalledTimes(2);
    tick({ deltaMS: 16 });
    expect(scene.tick).toHaveBeenCalledTimes(1);

    scene.win('B');
    expect(stage.getChildByLabel('replay', true)).not.toBeNull();
    expect(exitWrap(el).style.display).toBe('none');
    instance.unmount();
    expect(el.children).toHaveLength(0);
  });
});
