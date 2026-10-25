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

  it("affiche le bouton sur desktop quand fullscreen: 'always'", () => {
    setPointer(false);
    setFullscreenApi(true);
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { fullscreen: 'always' });
    expect(parent.querySelector(fsSelector)).not.toBeNull();
    btn.dispose();
  });

  it("n'affiche pas le bouton avec fullscreen: 'always' si l'API est absente", () => {
    setPointer(false);
    setFullscreenApi(false);
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { fullscreen: 'always' });
    expect(parent.querySelector(fsSelector)).toBeNull();
    btn.dispose();
  });
});

describe('createExitButton — option fullscreenParent', () => {
  it('place le bouton plein écran dans le conteneur fourni, pas à côté de quitter', () => {
    setPointer(true);
    setFullscreenApi(true);
    const parent = document.createElement('div');
    const elsewhere = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { fullscreenParent: elsewhere });
    expect(parent.querySelector(fsSelector)).toBeNull();
    expect(elsewhere.querySelector(fsSelector)).not.toBeNull();
    btn.dispose();
    expect(elsewhere.querySelector(fsSelector)).toBeNull();
  });

  it('setHidden masque aussi le bouton plein écran déplacé', () => {
    setPointer(true);
    setFullscreenApi(true);
    const elsewhere = document.createElement('div');
    const btn = createExitButton(document.createElement('div'), () => {}, {
      fullscreenParent: elsewhere,
    });
    const fs = elsewhere.querySelector<HTMLElement>(fsSelector)!;
    btn.setHidden(true);
    expect(fs.style.display).toBe('none');
    btn.setHidden(false);
    expect(fs.style.display).not.toBe('none');
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

describe('createExitButton — option iconOnly', () => {
  it('une grande croix seule, dans un bouton rond de la taille du plein écran', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { iconOnly: true });
    const exit = parent.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!;
    expect(exit.textContent).toBe('');
    expect(exit.querySelector('svg')).not.toBeNull();
    expect(exit.getAttribute('aria-label')).toBe('Quitter');
    expect(exit.style.width).toBe('34px');
    expect(exit.style.height).toBe('34px');
    btn.dispose();
  });

  it('sans l’option : « ✕ Quitter » en texte, comme avant', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {});
    expect(parent.querySelector('[data-test="game-exit"]')!.textContent).toBe('✕ Quitter');
    btn.dispose();
  });

  it('la confirmation fonctionne toujours', () => {
    const parent = document.createElement('div');
    const onExit = vi.fn();
    const btn = createExitButton(parent, onExit, { iconOnly: true });
    parent.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    parent.querySelector<HTMLButtonElement>('[data-test="game-exit-go"]')!.click();
    expect(onExit).toHaveBeenCalledTimes(1);
    btn.dispose();
  });
});

describe('createExitButton — placement inline', () => {
  it('pas de position imposée : le jeu le place dans sa propre colonne', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { placement: 'inline' });
    const wrap = parent.firstElementChild as HTMLElement;
    expect(wrap.style.position).toBe('relative');
    expect(wrap.style.top).toBe('');
    expect(wrap.style.left).toBe('');
    btn.dispose();
  });

  it('la confirmation s’ouvre par-dessus, sans déplacer la colonne', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { placement: 'inline', iconOnly: true });
    const exit = parent.querySelector<HTMLElement>('[data-test="game-exit"]')!;
    const panel = parent.querySelector<HTMLElement>('[data-test="game-exit-confirm-panel"]')!;
    exit.click();
    expect(panel.style.display).toBe('flex');
    expect(panel.style.position).toBe('absolute');
    expect(exit.style.display).not.toBe('none');
    expect(exit.style.visibility).toBe('hidden');
    parent.querySelector<HTMLButtonElement>('[data-test="game-exit-cancel"]')!.click();
    expect(panel.style.display).toBe('none');
    expect(exit.style.visibility).toBe('');
    btn.dispose();
  });
});
