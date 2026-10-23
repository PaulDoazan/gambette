import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Container, type FederatedPointerEvent } from 'pixi.js';
import type { GameContext } from '@gambette/game-sdk';
import { EXIT_REVEAL_DELAY_MS } from '../src/mount';

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

// Scène de jeu simulée : permet de déclencher une victoire sans jouer la partie.
type Fn = ReturnType<typeof vi.fn>;
interface FakeScene {
  view: Container;
  pointerDown: Fn;
  pointerMove: Fn;
  pointerUp: Fn;
  pointerCancel: Fn;
  releaseAll: Fn;
  tick: Fn;
  reset: Fn;
  destroy: Fn;
  pairs: readonly unknown[];
  win(): void;
}
const { fakeScenes } = vi.hoisted(() => ({ fakeScenes: [] as unknown[] }));
vi.mock('../src/scenes/GameScene', () => ({
  createGameScene: vi.fn((deps: { onWin(): void; pairs: readonly unknown[] }) => {
    const scene = {
      view: new Container(),
      pairs: deps.pairs,
      pointerDown: vi.fn(),
      pointerMove: vi.fn(),
      pointerUp: vi.fn(),
      pointerCancel: vi.fn(),
      releaseAll: vi.fn(),
      tick: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
      win: () => deps.onWin(),
    };
    fakeScenes.push(scene);
    return scene;
  }),
}));

// Sélecteur de calculs simulé : renvoie une autre sélection.
vi.mock('@gambette/math-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gambette/math-sdk')>();
  return {
    ...actual,
    openCalcsPicker: vi.fn(async () => [{ a: 2, b: 3, op: 'add' }]),
  };
});

const { mathRiver } = await import('../src/index');
const ctx = (): GameContext => ({ locale: 'fr', onExit: vi.fn() });
const scene0 = (): FakeScene => fakeScenes[0] as FakeScene;
const exitWrap = (el: HTMLElement): HTMLElement =>
  el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;
const gearOf = (el: HTMLElement): HTMLButtonElement =>
  el.querySelector<HTMLButtonElement>('[data-test="math-river-settings"]')!;
const touch = (stage: Container, pointerId: number): void => {
  stage.emit('pointerdown', {
    pointerId,
    getLocalPosition: () => ({ x: 360, y: 1100 }),
  } as unknown as FederatedPointerEvent);
};
const tapIn = (c: Container, label: string): void => {
  c.getChildByLabel(label, true)!.emit('pointertap', {} as FederatedPointerEvent);
};

beforeEach(() => {
  fakeApps.length = 0;
  fakeScenes.length = 0;
  lockState.fail = false;
  localStorage.clear();
  document.body.innerHTML = '';
});
afterEach(() => vi.useRealTimers());

describe('mathRiver.mount / unmount', () => {
  it('meta math-river avec consigne', () => {
    expect(mathRiver.meta.key).toBe('math-river');
    expect(mathRiver.meta.name).toBe('Math River');
    expect(mathRiver.meta.instructions).not.toBe('');
  });

  it('monte canvas, quitter au bord gauche et engrenage ; unmount vide el', async () => {
    const el = document.createElement('div');
    const instance = await mathRiver.mount(el, ctx());
    expect(el.querySelector('canvas')).not.toBeNull();
    expect(exitWrap(el).style.left).toBe('12px');
    expect(gearOf(el).parentElement!.style.left).toBe('12px');
    instance.unmount();
    expect(el.children).toHaveLength(0);
    const app = fakeApps[0]!;
    expect(app.destroy).toHaveBeenCalled();
    expect(app.ticker.remove).toHaveBeenCalledWith(app.ticker.add.mock.calls[0]![0]);
    expect(scene0().destroy).toHaveBeenCalledTimes(1);
  });

  it('Quitter (après confirmation) appelle ctx.onExit ; la rangée du dessous est masquée pendant la confirmation', async () => {
    const el = document.createElement('div');
    const c = ctx();
    const instance = await mathRiver.mount(el, c);
    el.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    expect(gearOf(el).parentElement!.style.visibility).toBe('hidden');
    el.querySelector<HTMLButtonElement>('[data-test="game-exit-cancel"]')!.click();
    expect(gearOf(el).parentElement!.style.visibility).toBe('');
    el.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    el.querySelector<HTMLButtonElement>('[data-test="game-exit-go"]')!.click();
    expect(c.onExit).toHaveBeenCalledTimes(1);
    instance.unmount();
  });

  it('pointercancel natif du canvas (que Pixi ne relaie pas) → pointerCancel ; retiré au unmount', async () => {
    const el = document.createElement('div');
    const instance = await mathRiver.mount(el, ctx());
    const canvas = fakeApps[0]!.canvas;
    const cancel = new Event('pointercancel') as Event & { pointerId: number };
    Object.defineProperty(cancel, 'pointerId', { value: 7 });
    canvas.dispatchEvent(cancel);
    expect(scene0().pointerCancel).toHaveBeenCalledWith(7);
    instance.unmount();
    canvas.dispatchEvent(cancel);
    expect(scene0().pointerCancel).toHaveBeenCalledTimes(1);
  });

  it('deux cycles mount/unmount sans écouteur window résiduel', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    for (let i = 0; i < 2; i++) (await mathRiver.mount(el, ctx())).unmount();
    for (const [type, handler] of add.mock.calls)
      expect(remove).toHaveBeenCalledWith(type, handler);
    expect(el.children).toHaveLength(0);
    add.mockRestore();
    remove.mockRestore();
  });

  it('échec après createApp : tout est nettoyé et le montage rejette', async () => {
    lockState.fail = true;
    const el = document.createElement('div');
    await expect(mathRiver.mount(el, ctx())).rejects.toThrow('verrou impossible');
    expect(el.children).toHaveLength(0);
    expect(fakeApps[0]!.destroy).toHaveBeenCalledTimes(1);
    expect(scene0().destroy).toHaveBeenCalledTimes(1);
  });

  it('le montage adapte la hauteur du plateau à l’écran', async () => {
    const dims = await import('../src/config/dimensions');
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
    const el = document.createElement('div');
    const instance = await mathRiver.mount(el, ctx());
    expect(dims.DESIGN_HEIGHT).toBe(dims.boardHeightFor(390, 844));
    instance.unmount();
    dims.configureBoard(1280);
  });
});

describe('cycle de victoire', () => {
  it('victoire → entrées bloquées, boutons masqués ; Rejouer → tout revient après le délai', async () => {
    const el = document.createElement('div');
    const instance = await mathRiver.mount(el, ctx());
    const { stage, ticker } = fakeApps[0]!;
    const tick = ticker.add.mock.calls[0]![0] as (t: { deltaMS: number }) => void;
    touch(stage, 1);
    expect(scene0().pointerDown).toHaveBeenCalledTimes(1);

    scene0().win();
    expect(stage.getChildByLabel('victory', true)).not.toBeNull();
    expect(exitWrap(el).style.display).toBe('none');
    expect(gearOf(el).parentElement!.style.display).toBe('none');
    touch(stage, 2);
    expect(scene0().pointerDown).toHaveBeenCalledTimes(1);
    tick({ deltaMS: 16 });
    expect(scene0().tick).not.toHaveBeenCalled();

    vi.useFakeTimers();
    tapIn(stage, 'replay');
    expect(scene0().reset).toHaveBeenCalledTimes(1);
    expect(stage.getChildByLabel('victory', true)).toBeNull();
    expect(exitWrap(el).style.display).toBe('none');
    vi.advanceTimersByTime(EXIT_REVEAL_DELAY_MS);
    expect(exitWrap(el).style.display).not.toBe('none');
    tick({ deltaMS: 16 });
    expect(scene0().tick).toHaveBeenCalledTimes(1);
    instance.unmount();
  });

  it('Quitter sur l’écran de victoire appelle ctx.onExit', async () => {
    const el = document.createElement('div');
    const c = ctx();
    const instance = await mathRiver.mount(el, c);
    scene0().win();
    tapIn(fakeApps[0]!.stage, 'quit');
    expect(c.onExit).toHaveBeenCalledTimes(1);
    instance.unmount();
  });
});

describe('réglages', () => {
  it('engrenage → panneau : seaux relâchés, pause, entrées ignorées', async () => {
    const el = document.createElement('div');
    const instance = await mathRiver.mount(el, ctx());
    gearOf(el).click();
    const { stage, ticker } = fakeApps[0]!;
    expect(stage.getChildByLabel('settings', true)).not.toBeNull();
    expect(scene0().releaseAll).toHaveBeenCalledTimes(1);
    ticker.add.mock.calls[0]![0]({ deltaMS: 16 });
    expect(scene0().tick).not.toHaveBeenCalled();
    touch(stage, 1);
    expect(scene0().pointerDown).not.toHaveBeenCalled();
    instance.unmount();
  });

  it('fermer sans changement → même partie ; nouveaux calculs → nouvelle partie, sauvegardée', async () => {
    const el = document.createElement('div');
    const instance = await mathRiver.mount(el, ctx());
    const { stage } = fakeApps[0]!;
    gearOf(el).click();
    tapIn(stage, 'close');
    expect(fakeScenes).toHaveLength(1);
    gearOf(el).click();
    tapIn(stage, 'calcs');
    await Promise.resolve();
    await Promise.resolve();
    tapIn(stage, 'close');
    expect(fakeScenes).toHaveLength(2);
    expect(scene0().destroy).toHaveBeenCalled();
    expect((fakeScenes[1] as FakeScene).pairs).toEqual([{ a: 2, b: 3, op: 'add' }]);
    expect(JSON.parse(localStorage.getItem('gambette.math-river.calcs')!)).toEqual([
      { a: 2, b: 3, op: 'add' },
    ]);
    instance.unmount();
  });
});
