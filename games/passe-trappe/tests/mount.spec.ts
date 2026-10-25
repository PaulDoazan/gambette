import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Container, type FederatedPointerEvent } from 'pixi.js';
import type { GameContext } from '@gambette/game-sdk';
import type { Player } from '../src/domain/types';
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

// Sélecteur de calculs simulé : renvoie une autre sélection.
vi.mock('@gambette/math-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gambette/math-sdk')>();
  return { ...actual, openCalcsPicker: vi.fn(async () => [{ a: 2, b: 3, op: 'add' }]) };
});

// Scène de jeu simulée : permet de déclencher une victoire sans piloter la physique.
interface FakeScene {
  view: Container;
  drag: Record<'pointerDown' | 'pointerMove' | 'pointerUp' | 'reset', ReturnType<typeof vi.fn>>;
  tick: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  win(player: Player): void;
  pucksPerPlayer: number;
  pairs: unknown;
}
const { fakeScenes, order } = vi.hoisted(() => ({
  fakeScenes: [] as unknown[],
  order: [] as string[],
}));
vi.mock('../src/scenes/GameScene', () => ({
  createGameScene: vi.fn(
    (deps: {
      onWin(player: Player): void;
      pucksPerPlayer: number;
      pairs: unknown;
      physics: { destroy(): void };
    }) => {
      const realDestroy = deps.physics.destroy.bind(deps.physics);
      deps.physics.destroy = () => {
        order.push('physics');
        realDestroy();
      };
      const scene = {
        view: new Container(),
        pucksPerPlayer: deps.pucksPerPlayer,
        pairs: deps.pairs,
        drag: { pointerDown: vi.fn(), pointerMove: vi.fn(), pointerUp: vi.fn(), reset: vi.fn() },
        tick: vi.fn(),
        reset: vi.fn(),
        destroy: vi.fn(() => order.push('scene')),
        win: (player: Player) => deps.onWin(player),
      };
      fakeScenes.push(scene);
      return scene;
    },
  ),
}));

const { passeTrappe } = await import('../src/index');
const ctx = (): GameContext => ({ locale: 'fr', onExit: vi.fn() });

beforeEach(() => {
  fakeApps.length = 0;
  fakeScenes.length = 0;
  order.length = 0;
  lockState.fail = false;
  localStorage.clear();
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

    vi.useFakeTimers();
    replay();
    expect(scene.reset).toHaveBeenCalledTimes(1);
    expect(stage.getChildByLabel('replay', true)).toBeNull();
    // Le clic qui suit le tap sur « Rejouer » ne doit pas atteindre les boutons du SDK
    // (plein écran, quitter) : ils ne réapparaissent qu'après la fin du geste.
    expect(exitWrap(el).style.display).toBe('none');
    vi.advanceTimersByTime(EXIT_REVEAL_DELAY_MS);
    expect(exitWrap(el).style.display).not.toBe('none');
    vi.useRealTimers();
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

describe('réglages', () => {
  const tapIn = (c: Container, label: string): void => {
    c.getChildByLabel(label, true)!.emit('pointertap', {} as FederatedPointerEvent);
  };
  const gearOf = (el: HTMLElement): HTMLButtonElement =>
    el.querySelector<HTMLButtonElement>('[data-test="passe-trappe-settings"]')!;
  let mounted: HTMLElement;
  const openSettings = (): Container => {
    gearOf(mounted).click();
    return fakeApps[0]!.stage.getChildByLabel('settings', true) as Container;
  };

  it('engrenage → panneau : pause (pas de tick, entrées ignorées), bouton quitter masqué', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    mounted = el;
    const panel = openSettings();
    expect(panel).not.toBeNull();
    const scene = fakeScenes[0] as FakeScene;
    expect(scene.drag.reset).toHaveBeenCalledTimes(1);
    fakeApps[0]!.ticker.add.mock.calls[0]![0]({ deltaMS: 16 });
    expect(scene.tick).not.toHaveBeenCalled();
    fakeApps[0]!.stage.emit('pointerdown', {
      pointerId: 1,
      getLocalPosition: () => ({ x: 360, y: 900 }),
    } as unknown as FederatedPointerEvent);
    expect(scene.drag.pointerDown).not.toHaveBeenCalled();
    const exit = el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;
    expect(exit.style.display).toBe('none');
    instance.unmount();
  });

  it('l’engrenage reprend le bouton de Tour de calcul, sur la cloison à droite', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    const gear = gearOf(el);
    expect(gear.tagName).toBe('BUTTON');
    expect(gear.getAttribute('aria-label')).toBe('Choisir les réglages');
    expect(gear.style.width).toBe('40px');
    expect(gear.style.height).toBe('40px');
    expect(gear.style.borderRadius).toBe('999px');
    // Icône SVG (pas un caractère : centrage exact, sans dépendre de la police) au trait fin,
    // comme le symbole ⚙ d'origine, dans un bouton de la hauteur de la cloison, sans fond.
    const svg = gear.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke-width')).toBe('2');
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(30);
    expect(gear.style.height).toBe('40px');
    expect(gear.style.display).toBe('flex');
    expect(gear.style.alignItems).toBe('center');
    expect(gear.style.justifyContent).toBe('center');
    expect(gear.style.borderStyle).toBe('none');
    expect(gear.style.backgroundColor).toBe('transparent');
    // Plus d'engrenage dessiné dans la scène (le toucher ne peut plus atteindre le tir).
    expect(fakeApps[0]!.stage.getChildByLabel('gear', true)).toBeNull();
    instance.unmount();
    expect(el.querySelector('[data-test="passe-trappe-settings"]')).toBeNull();
  });

  it('le bouton plein écran est à côté de l’engrenage (à sa gauche), plus à côté de quitter', async () => {
    const mm = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('coarse'),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    try {
      const el = document.createElement('div');
      const instance = await passeTrappe.mount(el, ctx());
      const fs = el.querySelector<HTMLElement>('[data-test="game-fullscreen"]')!;
      const gear = gearOf(el);
      expect(fs.parentElement).toBe(gear.parentElement);
      expect(fs.nextElementSibling).toBe(gear);
      const exit = el.querySelector('[data-test="game-exit"]')!;
      expect(exit.parentElement!.contains(fs)).toBe(false);
      instance.unmount();
      expect(el.querySelector('[data-test="game-fullscreen"]')).toBeNull();
    } finally {
      window.matchMedia = mm;
      // @ts-expect-error retrait du simulacre
      delete HTMLElement.prototype.requestFullscreen;
    }
  });

  it('l’engrenage est masqué pendant le panneau, réaffiché après', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    mounted = el;
    const panel = openSettings();
    // Le groupe de droite (plein écran + engrenage) est masqué en entier.
    expect(gearOf(el).parentElement!.style.display).toBe('none');
    vi.useFakeTimers();
    tapIn(panel, 'close');
    vi.advanceTimersByTime(EXIT_REVEAL_DELAY_MS);
    expect(gearOf(el).parentElement!.style.display).not.toBe('none');
    vi.useRealTimers();
    instance.unmount();
  });

  it('fermer sans changement → même partie ; avec changement → nouvelle partie', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    mounted = el;
    let panel = openSettings();
    vi.useFakeTimers();
    tapIn(panel, 'close');
    expect(fakeScenes).toHaveLength(1);
    expect(fakeApps[0]!.stage.getChildByLabel('settings', true)).toBeNull();
    const exit = el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;
    expect(exit.style.display).toBe('none');
    vi.advanceTimersByTime(EXIT_REVEAL_DELAY_MS);
    expect(exit.style.display).not.toBe('none');
    vi.useRealTimers();
    panel = openSettings();
    tapIn(panel, 'plus');
    tapIn(panel, 'close');
    expect(fakeScenes).toHaveLength(2);
    expect((fakeScenes[0] as FakeScene).destroy).toHaveBeenCalled();
    expect((fakeScenes[1] as FakeScene).pucksPerPlayer).toBe(6);
    // La nouvelle partie reçoit le tick et les entrées.
    fakeApps[0]!.ticker.add.mock.calls[0]![0]({ deltaMS: 16 });
    expect((fakeScenes[1] as FakeScene).tick).toHaveBeenCalledTimes(1);
    expect((fakeScenes[0] as FakeScene).tick).not.toHaveBeenCalled();
    instance.unmount();
    expect((fakeScenes[1] as FakeScene).destroy).toHaveBeenCalledTimes(1);
  });

  it('démonter avec le panneau ouvert ne lève pas ; la scène est détruite avant la physique', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    mounted = el;
    openSettings();
    expect(() => instance.unmount()).not.toThrow();
    expect((fakeScenes[0] as FakeScene).destroy).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['scene', 'physics']);
    expect(el.children).toHaveLength(0);
  });
});

describe('hauteur du plateau', () => {
  it('le montage adapte la hauteur du plateau à l’écran', async () => {
    const dims = await import('../src/config/dimensions');
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    expect(dims.DESIGN_HEIGHT).toBe(dims.boardHeightFor(390, 844));
    expect(dims.DESIGN_HEIGHT).toBeGreaterThan(1280);
    // Cloison assez épaisse à l'échelle de cet écran pour couvrir les boutons.
    expect(dims.DIVIDER_THICKNESS * (390 / 720)).toBeGreaterThanOrEqual(dims.UI_BAND_PX);
    instance.unmount();
    dims.configureBoard(1280);
  });
});

describe('boutons du SDK après un écran en surimpression', () => {
  afterEach(() => vi.useRealTimers());

  it('nouvelle victoire avant la fin du délai → les boutons restent masqués', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    const stage = fakeApps[0]!.stage;
    const scene = fakeScenes[0] as FakeScene;
    const wrap = el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;
    vi.useFakeTimers();
    scene.win('A');
    stage.getChildByLabel('replay', true)!.emit('pointertap', {} as FederatedPointerEvent);
    scene.win('B');
    vi.advanceTimersByTime(EXIT_REVEAL_DELAY_MS * 2);
    expect(wrap.style.display).toBe('none');
    instance.unmount();
  });

  it('démontage pendant le délai → aucune erreur', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    const stage = fakeApps[0]!.stage;
    vi.useFakeTimers();
    (fakeScenes[0] as FakeScene).win('A');
    stage.getChildByLabel('replay', true)!.emit('pointertap', {} as FederatedPointerEvent);
    instance.unmount();
    expect(() => vi.advanceTimersByTime(EXIT_REVEAL_DELAY_MS * 2)).not.toThrow();
  });
});

describe('réglages — calculs par joueur', () => {
  const tap = (c: Container, label: string): void => {
    c.getChildByLabel(label, true)!.emit('pointertap', {} as FederatedPointerEvent);
  };

  it('calculs séparés : chaque joueur reçoit sa sélection, titre du sélecteur, choix conservé', async () => {
    localStorage.setItem(
      'gambette.passe-trappe.calcs',
      JSON.stringify([{ a: 6, b: 8, op: 'mul' }]),
    );
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    el.querySelector<HTMLButtonElement>('[data-test="passe-trappe-settings"]')!.click();
    const panel = fakeApps[0]!.stage.getChildByLabel('settings', true) as Container;
    tap(panel, 'same');
    tap(panel, 'calcsB');
    await Promise.resolve();
    await Promise.resolve();
    const { openCalcsPicker } = await import('@gambette/math-sdk');
    expect(vi.mocked(openCalcsPicker)).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Calculs du joueur du haut' }),
    );
    tap(panel, 'close');
    expect((fakeScenes[1] as FakeScene).pairs).toEqual({
      A: [{ a: 6, b: 8, op: 'mul' }],
      B: [{ a: 2, b: 3, op: 'add' }],
    });
    expect(localStorage.getItem('gambette.passe-trappe.calcs.same')).toBe('false');
    instance.unmount();
  });
});
