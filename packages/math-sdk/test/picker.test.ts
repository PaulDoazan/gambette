import { describe, it, expect, afterEach } from 'vitest';
import { openCalcsPicker } from '../src/picker';
import type { Pair } from '../src/domain/calcs';

const INITIAL: Pair[] = [{ a: 7, b: 8, op: 'mul' }];
const box = (root: ParentNode, a: number, b: number, op: string) =>
  root.querySelector<HTMLInputElement>(
    `input[data-a="${a}"][data-b="${b}"][data-op="${op}"]:not([data-random])`,
  )!;
const check = (cb: HTMLInputElement, on: boolean) => {
  cb.checked = on;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('openCalcsPicker', () => {
  it('s’ouvre dans document.body avec la sélection initiale cochée', () => {
    void openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    expect(root).not.toBeNull();
    expect(box(root, 7, 8, 'mul').checked).toBe(true);
    expect(box(root, 6, 8, 'mul').checked).toBe(false);
  });

  it('résout la nouvelle sélection au clic Retour et se retire', async () => {
    const p = openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    check(box(root, 6, 8, 'mul'), true);
    root.querySelector<HTMLButtonElement>('.cp-back')!.click();
    const out = await p;
    expect(out).toEqual(expect.arrayContaining([...INITIAL, { a: 6, b: 8, op: 'mul' }]));
    expect(out).toHaveLength(2);
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });

  it('interdit de fermer sans aucun calcul coché', () => {
    void openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    check(box(root, 7, 8, 'mul'), false);
    expect(root.querySelector<HTMLButtonElement>('.cp-back')!.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('.cp-close')!.disabled).toBe(true);
    expect(root.querySelector('.cp-warn')!.textContent).not.toBe('');
  });

  it('s’attache au container fourni et disparaît avec lui', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    void openCalcsPicker({ initial: INITIAL, container });
    expect(container.querySelector('.cp-overlay')).not.toBeNull();
    container.remove();
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });
});

describe('openCalcsPicker, titre', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('titre par défaut, ou celui fourni', () => {
    void openCalcsPicker({ initial: INITIAL });
    expect(document.querySelector('.cp-title')!.textContent).toBe('Choisis tes calculs');
    document.body.innerHTML = '';
    void openCalcsPicker({ initial: INITIAL, title: 'Calculs du joueur du haut' });
    expect(document.querySelector('.cp-title')!.textContent).toBe('Calculs du joueur du haut');
  });
});

describe('openCalcsPicker, tables repliables', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  const sectionOf = (root: ParentNode, a: number, op = 'mul') =>
    root.querySelector<HTMLElement>(`.cp-panel[data-op="${op}"] .cp-section[data-a="${a}"]`)!;
  const toggleOf = (s: HTMLElement) => s.querySelector<HTMLButtonElement>('.cp-section-toggle')!;
  const rowsOf = (s: HTMLElement) => s.querySelector<HTMLElement>('.cp-section-rows')!;

  it('chaque table est repliée au départ', () => {
    void openCalcsPicker({ initial: INITIAL });
    const s = sectionOf(document, 7);
    expect(rowsOf(s).hidden).toBe(true);
    expect(toggleOf(s).getAttribute('aria-expanded')).toBe('false');
  });

  it('toucher l’en-tête déplie la table, le toucher encore la replie ; les autres ne bougent pas', () => {
    void openCalcsPicker({ initial: INITIAL });
    const s7 = sectionOf(document, 7);
    toggleOf(s7).click();
    expect(rowsOf(s7).hidden).toBe(false);
    expect(toggleOf(s7).getAttribute('aria-expanded')).toBe('true');
    expect(rowsOf(sectionOf(document, 8)).hidden).toBe(true);
    toggleOf(s7).click();
    expect(rowsOf(s7).hidden).toBe(true);
  });

  it('l’en-tête montre combien de calculs sont choisis, à jour', () => {
    void openCalcsPicker({ initial: INITIAL });
    const s7 = sectionOf(document, 7);
    const count = s7.querySelector('.cp-section-count')!;
    expect(count.textContent).toBe('1/10');
    check(box(document, 7, 9, 'mul'), true);
    expect(count.textContent).toBe('2/10');
    expect(sectionOf(document, 6).querySelector('.cp-section-count')!.textContent).toBe('0/10');
  });

  it('la case de l’en-tête coche toute la table sans la déplier', () => {
    void openCalcsPicker({ initial: INITIAL });
    const s6 = sectionOf(document, 6);
    const all = s6.querySelector<HTMLInputElement>('.cp-section-header input[type="checkbox"]')!;
    check(all, true);
    expect(s6.querySelector('.cp-section-count')!.textContent).toBe('10/10');
    expect(rowsOf(s6).hidden).toBe(true);
  });
});
