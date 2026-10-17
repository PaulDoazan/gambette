import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GameContext } from '@gambette/game-sdk';
import type { Pair } from '@gambette/math-sdk';

const sceneMock = {
  reset: vi.fn(),
  currentPositionOnAxis: vi.fn(() => 0),
  texturePlacedFace: vi.fn(),
  applyCut: vi.fn(),
  dropCurrent: vi.fn(),
  tick: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
};
vi.mock('../src/scene', () => ({ createScene: vi.fn(() => sceneMock) }));

// Sélecteur de calculs piloté par le test : la promesse se résout à la main.
const picker = vi.hoisted(() => ({ resolve: null as null | ((p: Pair[]) => void) }));
vi.mock('@gambette/math-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gambette/math-sdk')>();
  return {
    ...actual,
    openCalcsPicker: vi.fn(
      () =>
        new Promise<Pair[]>((resolve) => {
          picker.resolve = resolve;
        }),
    ),
  };
});

import { openCalcsPicker } from '@gambette/math-sdk';
import { mountTowerMath } from '../src/game';
import { RECORD_KEY } from '../src/record';

const CALCS_KEY = 'gambette.tower-math.calcs';

function makeCtx(over: Partial<GameContext> = {}): GameContext {
  return { locale: 'fr', onScore: vi.fn(), onGameOver: vi.fn(), onExit: vi.fn(), ...over };
}
const q = <T extends HTMLElement>(el: HTMLElement, test: string): T =>
  el.querySelector<T>(`[data-test="${test}"]`)!;
const buttons = (el: HTMLElement): HTMLButtonElement[] => [
  ...el.querySelectorAll<HTMLButtonElement>('[data-test="tower-choice"]'),
];
// Sélection réduite à 6 × 7 : la bonne réponse est toujours 42.
const good = (el: HTMLElement): HTMLButtonElement =>
  buttons(el).find((b) => b.textContent === '42')!;
const wrong = (el: HTMLElement): HTMLButtonElement =>
  buttons(el).find((b) => b.textContent !== '42')!;
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.clear();
  localStorage.setItem(CALCS_KEY, JSON.stringify([{ a: 6, b: 7, op: 'mul' }]));
  sceneMock.currentPositionOnAxis.mockReturnValue(0);
  picker.resolve = null;
});
afterEach(() => vi.useRealTimers());

describe('mountTowerMath', () => {
  it('affiche le calcul, 5 résultats distincts dont le bon, le score et les boutons', () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    expect(q(el, 'tower-root')).not.toBeNull();
    expect(el.querySelector('canvas')).not.toBeNull();
    expect(q(el, 'tower-calc').textContent).toBe('6 × 7');
    const labels = buttons(el).map((b) => b.textContent);
    expect(labels).toHaveLength(5);
    expect(new Set(labels).size).toBe(5);
    expect(labels).toContain('42');
    expect(q(el, 'tower-score').textContent).toBe('Score : 0');
    expect(q(el, 'game-exit')).not.toBeNull();
    expect(q(el, 'tower-settings')).not.toBeNull();
    expect(sceneMock.reset).toHaveBeenCalledTimes(1);
    inst.unmount();
  });

  it('bon résultat → découpe, calcul résolu sur le pavé, onScore(1), nouveau quiz', () => {
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    good(el).click();
    expect(sceneMock.applyCut).toHaveBeenCalledTimes(1);
    expect(sceneMock.texturePlacedFace).toHaveBeenCalledWith('6 × 7 = 42');
    expect(ctx.onScore).toHaveBeenCalledWith(1);
    expect(q(el, 'tower-score').textContent).toBe('Score : 1');
    expect(buttons(el).map((b) => b.textContent)).toContain('42');
    inst.unmount();
  });

  it('les 5 résultats sont dans une colonne calée juste sous le calcul', () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    const column = q(el, 'tower-choices');
    expect(column.previousElementSibling).toBe(q(el, 'tower-calc'));
    expect(column.children).toHaveLength(5);
    expect(column.style.justifyContent).toBe('flex-start');
    // Même écart entre le cadre et le 1er bouton qu'entre deux boutons.
    expect(q(el, 'tower-quiz').style.gap).toBe(column.style.gap);
    expect(column.style.paddingTop).toBe('');
    inst.unmount();
  });

  it("répond dès l'appui (pointerdown), sans attendre le relâcher", () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    good(el).dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    expect(sceneMock.applyCut).toHaveBeenCalledTimes(1);
    inst.unmount();
  });

  it("le clic souris qui suit l'appui ne répond pas une seconde fois", () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    const btn = good(el);
    btn.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    btn.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    expect(sceneMock.applyCut).toHaveBeenCalledTimes(1);
    inst.unmount();
  });

  it('ignore le clic droit', () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    good(el).dispatchEvent(new MouseEvent('pointerdown', { button: 2, bubbles: true }));
    expect(sceneMock.applyCut).not.toHaveBeenCalled();
    inst.unmount();
  });

  it('mauvais résultat → chute, onGameOver({score}) après le délai, écran Rejouer', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    wrong(el).click();
    expect(sceneMock.dropCurrent).toHaveBeenCalledTimes(1);
    expect(ctx.onGameOver).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).toHaveBeenCalledWith({ score: 0 });
    expect(q(el, 'tower-replay').style.display).toBe('flex');
    inst.unmount();
  });

  it('mauvais résultat → bouton cliqué en rouge, bonne réponse en vert, puis correction', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    const clicked = wrong(el);
    clicked.click();
    expect(clicked.dataset.state).toBe('wrong');
    expect(good(el).dataset.state).toBe('right');
    vi.advanceTimersByTime(1000);
    const end = q(el, 'tower-replay').textContent;
    expect(end).toContain('Mauvaise réponse');
    expect(end).toContain('6 × 7 = 42');
    inst.unmount();
  });

  it('timing raté → écran de fin « Raté », boutons non marqués', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    sceneMock.currentPositionOnAxis.mockReturnValue(99);
    good(el).click();
    expect(buttons(el).every((b) => !b.dataset.state)).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(q(el, 'tower-replay').textContent).toContain('Raté');
    expect(q(el, 'tower-replay').textContent).not.toContain('Mauvaise réponse');
    inst.unmount();
  });

  it('Rejouer efface le marquage des boutons', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    wrong(el).click();
    vi.advanceTimersByTime(1000);
    q<HTMLButtonElement>(el, 'tower-replay-btn').click();
    expect(buttons(el).every((b) => !b.dataset.state)).toBe(true);
    inst.unmount();
  });

  it('bon résultat mais pavé hors chevauchement (timing raté) → onGameOver', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    sceneMock.currentPositionOnAxis.mockReturnValue(99);
    good(el).click();
    expect(sceneMock.dropCurrent).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).toHaveBeenCalledWith({ score: 0 });
    inst.unmount();
  });

  it('Rejouer relance une partie propre', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    wrong(el).click();
    vi.advanceTimersByTime(1000);
    q<HTMLButtonElement>(el, 'tower-replay-btn').click();
    expect(sceneMock.reset).toHaveBeenCalledTimes(2);
    expect(q(el, 'tower-replay').style.display).toBe('none');
    expect(q(el, 'tower-score').textContent).toBe('Score : 0');
    inst.unmount();
  });

  it('clics ignorés pendant la transition de fin de partie', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    wrong(el).click();
    buttons(el).forEach((b) => b.click());
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).toHaveBeenCalledTimes(1);
    expect(sceneMock.applyCut).not.toHaveBeenCalled();
    inst.unmount();
  });

  it('record battu → sauvegardé et affiché à la partie suivante', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    good(el).click();
    wrong(el).click();
    vi.advanceTimersByTime(1000);
    expect(localStorage.getItem(RECORD_KEY)).toBe('1');
    inst.unmount();
    const el2 = document.createElement('div');
    const inst2 = mountTowerMath(el2, makeCtx());
    expect(q(el2, 'tower-record').textContent).toBe('Record : 1');
    inst2.unmount();
  });

  it('record battu puis engrenage → le record affiché est conservé et sauvegardé', async () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    good(el).click();
    good(el).click();
    expect(q(el, 'tower-record').textContent).toBe('Record : 2');
    q<HTMLButtonElement>(el, 'tower-settings').click();
    picker.resolve!([{ a: 6, b: 7, op: 'mul' }]);
    await flush();
    expect(q(el, 'tower-record').textContent).toBe('Record : 2');
    expect(localStorage.getItem(RECORD_KEY)).toBe('2');
    inst.unmount();
  });

  it('record battu puis Quitter en pleine partie → record sauvegardé', () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    good(el).click();
    inst.unmount();
    expect(localStorage.getItem(RECORD_KEY)).toBe('1');
  });

  it('Quitter → confirmation puis ctx.onExit', () => {
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    q<HTMLButtonElement>(el, 'game-exit').click();
    expect(ctx.onExit).not.toHaveBeenCalled();
    q<HTMLButtonElement>(el, 'game-exit-go').click();
    expect(ctx.onExit).toHaveBeenCalledTimes(1);
    inst.unmount();
  });

  it('engrenage → sélecteur dans la racine, jeu en pause, puis nouvelle tour avec la sélection sauvegardée', async () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'],
    });
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    q<HTMLButtonElement>(el, 'tower-settings').click();
    q<HTMLButtonElement>(el, 'tower-settings').click(); // double clic : un seul sélecteur
    expect(openCalcsPicker).toHaveBeenCalledTimes(1);
    expect(openCalcsPicker).toHaveBeenCalledWith({
      initial: [{ a: 6, b: 7, op: 'mul' }],
      container: q(el, 'tower-root'),
    });

    // En pause : le pavé ne bouge plus et les réponses sont ignorées.
    sceneMock.tick.mockClear();
    vi.advanceTimersByTime(200);
    expect(sceneMock.tick).not.toHaveBeenCalled();
    good(el).click();
    expect(sceneMock.applyCut).not.toHaveBeenCalled();

    picker.resolve!([{ a: 3, b: 4, op: 'add' }]);
    await flush();
    expect(JSON.parse(localStorage.getItem(CALCS_KEY)!)).toEqual([{ a: 3, b: 4, op: 'add' }]);
    expect(sceneMock.reset).toHaveBeenCalledTimes(2);
    expect(q(el, 'tower-calc').textContent).toBe('3 + 4');
    vi.advanceTimersByTime(200);
    expect(sceneMock.tick).toHaveBeenCalled();
    inst.unmount();
  });

  it('unmount vide el, dispose la scène et retire l’écouteur resize', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    inst.unmount();
    expect(el.innerHTML).toBe('');
    expect(sceneMock.dispose).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('unmount pendant le délai de fin de partie → onGameOver jamais appelé', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    wrong(el).click();
    inst.unmount();
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).not.toHaveBeenCalled();
    expect(el.innerHTML).toBe('');
  });

  it('unmount avec le sélecteur ouvert, puis résolution tardive → sans effet', async () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    q<HTMLButtonElement>(el, 'tower-settings').click();
    inst.unmount();
    picker.resolve!([{ a: 3, b: 4, op: 'add' }]);
    await flush();
    expect(sceneMock.reset).toHaveBeenCalledTimes(1);
    expect(el.innerHTML).toBe('');
  });
});
