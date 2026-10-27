import { describe, it, expect, afterEach } from 'vitest';
import { openCalcsPicker } from '../src/picker';
import { twoDigitPairs, type Pair } from '../src/domain/calcs';

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

describe('openCalcsPicker, sous-catégories', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  const nodesOf = (op: string) =>
    [...document.querySelectorAll<HTMLElement>(`.cp-panel[data-op="${op}"] > .cp-section`)].map(
      (n) => n.querySelector('.cp-section-name')!.textContent,
    );
  const tablesNode = (op: string) =>
    document.querySelector<HTMLElement>(`.cp-panel[data-op="${op}"] > .cp-tables`)!;

  it('multiplication et addition : les tables et la fourchette, au même niveau', () => {
    void openCalcsPicker({ initial: INITIAL });
    expect(nodesOf('mul')).toEqual([
      'Tables de multiplication',
      'Multiplications dans une fourchette',
    ]);
    expect(nodesOf('add')).toEqual(['Tables d’addition', 'Additions dans une fourchette']);
    expect(nodesOf('sub')).toEqual(['Tables de soustraction', 'Soustractions dans une fourchette']);
  });

  it('les tables sont regroupées sous leur sous-catégorie, avec le tirage aléatoire', () => {
    void openCalcsPicker({ initial: INITIAL });
    const node = tablesNode('mul');
    expect(node.querySelectorAll('.cp-section[data-a]')).toHaveLength(9);
    expect(node.querySelector('input[data-random]')).not.toBeNull();
    // Pas de compteur global : chaque table a le sien.
    expect(node.querySelector(':scope > .cp-section-header .cp-section-count')).toBeNull();
    expect(node.querySelector('.cp-section[data-a="7"] .cp-section-count')!.textContent).toBe(
      '1/10',
    );
  });

  it('la case des tables coche toutes les tables', async () => {
    const p = openCalcsPicker({ initial: INITIAL });
    check(tablesNode('add').querySelector<HTMLInputElement>('.cp-section-header input')!, true);
    document.querySelector<HTMLButtonElement>('.cp-back')!.click();
    const out = await p;
    expect(out).toHaveLength(100);
    expect(out.every((q) => q.op === 'add')).toBe(true);
  });
});

describe.each([
  ['add', 36],
  ['mul', 36],
  ['sub', 21],
] as const)('openCalcsPicker, calculs %s dans une fourchette', (op, count2025) => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  const other = op === 'add' ? 'mul' : 'add';
  const third = op === 'sub' ? 'mul' : 'sub';
  const node = (root: ParentNode) =>
    root.querySelector<HTMLElement>(`.cp-panel[data-op="${op}"] .cp-range`)!;
  const rangeCb = (root: ParentNode) =>
    node(root).querySelector<HTMLInputElement>('input[data-range]')!;
  const minInput = (root: ParentNode) =>
    node(root).querySelector<HTMLInputElement>('.cp-range-min')!;
  const maxInput = (root: ParentNode) =>
    node(root).querySelector<HTMLInputElement>('.cp-range-max')!;
  const setValue = (input: HTMLInputElement, v: string) => {
    input.value = v;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('décochée par défaut, la fourchette affichée dans l’en-tête', () => {
    void openCalcsPicker({ initial: INITIAL });
    expect(rangeCb(document).checked).toBe(false);
    expect(node(document).querySelector('.cp-section-count')!.textContent).toBe('10 à 30');
  });

  it('régler la fourchette coche la case et donne tous les calculs de la fourchette', async () => {
    const p = openCalcsPicker({ initial: [{ a: 7, b: 8, op: other }] });
    setValue(minInput(document), '20');
    setValue(maxInput(document), '25');
    expect(rangeCb(document).checked).toBe(true);
    expect(node(document).querySelector('.cp-section-count')!.textContent).toBe('20 à 25');
    // Les calculs d'une autre opération sont décochés, comme pour les tables.
    expect(box(document, 7, 8, other).checked).toBe(false);
    document.querySelector<HTMLButtonElement>('.cp-back')!.click();
    const out = await p;
    expect(out).toHaveLength(count2025);
    expect(out).toContainEqual({ a: 25, b: 20, op });
    expect(out.every((q) => q.op === op && q.a >= 20 && q.b <= 25)).toBe(true);
  });

  it('se rouvre avec la fourchette enregistrée', () => {
    const initial = [{ a: 3, b: 4, op }, ...twoDigitPairs(op, 10, 40)];
    void openCalcsPicker({ initial });
    expect(rangeCb(document).checked).toBe(true);
    expect(minInput(document).value).toBe('10');
    expect(maxInput(document).value).toBe('40');
    expect(box(document, 3, 4, op).checked).toBe(true);
    // 10 + 10 (ou 10 × 10) vient de la fourchette, pas de la table de 10.
    expect(box(document, 10, 10, op).checked).toBe(false);
  });

  it('garde des bornes à 2 chiffres, le max au-dessus du min', () => {
    void openCalcsPicker({ initial: INITIAL });
    setValue(minInput(document), '5');
    expect(minInput(document).value).toBe('10');
    setValue(maxInput(document), '150');
    expect(maxInput(document).value).toBe('99');
    setValue(minInput(document), '99');
    expect(minInput(document).value).toBe('98');
    expect(maxInput(document).value).toBe('99');
    setValue(maxInput(document), '30');
    expect(minInput(document).value).toBe('29');
  });

  it('cocher un calcul d’une autre opération décoche la fourchette', () => {
    void openCalcsPicker({ initial: twoDigitPairs(op, 10, 20) });
    check(box(document, 6, 8, third), true);
    expect(rangeCb(document).checked).toBe(false);
  });
});
