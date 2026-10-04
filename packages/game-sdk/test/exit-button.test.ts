// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createExitButton } from '../src/exit-button';

const fsSelector = '[data-test="game-fullscreen"]';

/** Simule un device : pointeur grossier (mobile) ou fin (desktop). */
function setPointer(coarse: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('coarse') ? coarse : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** Active ou non l'API Fullscreen sur les éléments. */
function setFullscreenApi(available: boolean): void {
  if (available) {
    HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error API non typée dans le DOM standard
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  } else {
    // @ts-expect-error suppression volontaire pour le test
    delete HTMLElement.prototype.requestFullscreen;
    // @ts-expect-error idem
    delete HTMLElement.prototype.webkitRequestFullscreen;
  }
}

describe('createExitButton — bouton plein écran', () => {
  let root: HTMLElement;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('affiche le bouton plein écran sur mobile quand l’API est disponible', () => {
    setPointer(true);
    setFullscreenApi(true);
    createExitButton(root, vi.fn());
    expect(root.querySelector(fsSelector)).not.toBeNull();
  });

  it('n’affiche pas le bouton sur desktop (pointeur fin)', () => {
    setPointer(false);
    setFullscreenApi(true);
    createExitButton(root, vi.fn());
    expect(root.querySelector(fsSelector)).toBeNull();
  });

  it('n’affiche pas le bouton si l’API Fullscreen est absente (ex. iPhone)', () => {
    setPointer(true);
    setFullscreenApi(false);
    createExitButton(root, vi.fn());
    expect(root.querySelector(fsSelector)).toBeNull();
  });

  it('un clic demande le plein écran sur la racine du document (persiste hors jeu)', () => {
    setPointer(true);
    setFullscreenApi(true);
    createExitButton(root, vi.fn());
    const btn = root.querySelector<HTMLButtonElement>(fsSelector)!;
    btn.click();
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('le bouton est placé juste à côté du bouton quitter', () => {
    setPointer(true);
    setFullscreenApi(true);
    createExitButton(root, vi.fn());
    const exit = root.querySelector('[data-test="game-exit"]')!;
    const fs = root.querySelector(fsSelector)!;
    expect(exit.parentElement).toBe(fs.parentElement);
  });

  it('dispose() retire le bouton et ses écouteurs', () => {
    setPointer(true);
    setFullscreenApi(true);
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const handle = createExitButton(root, vi.fn());
    handle.dispose();
    expect(root.querySelector(fsSelector)).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
  });
});

describe('createExitButton — option fullscreen', () => {
  it("n'ajoute pas le bouton plein écran quand fullscreen: false, même sur mobile", () => {
    setPointer(true);
    setFullscreenApi(true);
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { fullscreen: false });
    expect(parent.querySelector(fsSelector)).toBeNull();
    btn.dispose();
  });
});

describe('createExitButton — placement', () => {
  it('top par défaut : centré en haut', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {});
    const wrap = parent.firstElementChild as HTMLElement;
    expect(wrap.style.top).toBe('12px');
    expect(wrap.style.left).toBe('50%');
    btn.dispose();
  });

  it('side : bord gauche, centré verticalement', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { placement: 'side' });
    const wrap = parent.firstElementChild as HTMLElement;
    expect(wrap.style.left).toBe('12px');
    expect(wrap.style.top).toBe('50%');
    expect(wrap.style.transform).toBe('translateY(-50%)');
    btn.dispose();
  });
});

describe('createExitButton — setHidden', () => {
  it('masque puis réaffiche le bouton', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {});
    const wrap = parent.firstElementChild as HTMLElement;
    const initial = wrap.style.display;
    btn.setHidden(true);
    expect(wrap.style.display).toBe('none');
    btn.setHidden(false);
    expect(wrap.style.display).toBe(initial);
    btn.dispose();
  });

  it('referme la confirmation ouverte en masquant', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {});
    parent.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    btn.setHidden(true);
    btn.setHidden(false);
    const panel = parent.querySelector<HTMLElement>('[data-test="game-exit-confirm-panel"]')!;
    const exit = parent.querySelector<HTMLElement>('[data-test="game-exit"]')!;
    expect(panel.style.display).toBe('none');
    expect(exit.style.display).toBe('');
    btn.dispose();
  });
});
