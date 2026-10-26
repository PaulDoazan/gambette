import { TWO_DIGIT_MAX, TWO_DIGIT_MIN, type AddRange, type Op, type Pair } from '../domain/calcs';

const MUL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const ADD_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const SUB_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const MULTIPLIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const OP_SYMBOL: Record<Op, string> = { mul: '×', add: '+', sub: '−' };
export const OP_LABEL: Record<Op, string> = {
  mul: 'Multiplication',
  add: 'Addition',
  sub: 'Soustraction',
};

export interface OpPanelHandles {
  panel: HTMLDivElement;
  randomCb: HTMLInputElement;
  pairCbs: HTMLInputElement[];
  /** Case des additions à 2 chiffres (onglet Addition seulement). */
  rangeCb: HTMLInputElement | null;
}

/** Fourchette proposée tant qu'aucune n'a été choisie. */
const DEFAULT_ADD_RANGE: AddRange = { min: 10, max: 30 };

export const pairKey = (a: number, b: number, op: Op): string => `${op}:${a}x${b}`;

export const initialKeys = (initial: readonly Pair[]): Set<string> =>
  new Set(initial.map((p) => pairKey(p.a, p.b, p.op)));

const computeAnswer = (a: number, b: number, op: Op): number => {
  if (op === 'mul') return a * b;
  if (op === 'add') return a + b;
  return a - b;
};

const buildRow = (
  a: number,
  b: number,
  op: Op,
  checked: boolean,
): { row: HTMLLabelElement; cb: HTMLInputElement } => {
  const row = document.createElement('label');
  row.className = 'cp-row';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = checked;
  cb.dataset.a = String(a);
  cb.dataset.b = String(b);
  cb.dataset.op = op;
  const text = document.createElement('span');
  text.textContent = `${a} ${OP_SYMBOL[op]} ${b} = ${computeAnswer(a, b, op)}`;
  row.append(cb, text);
  return { row, cb };
};

/**
 * En-tête d'une table : la case coche toute la table ; le reste de la ligne (nom, nombre de
 * calculs choisis, flèche) la déplie ou la replie.
 */
const buildSectionHeader = (
  a: number,
): {
  header: HTMLDivElement;
  cb: HTMLInputElement;
  toggle: HTMLButtonElement;
  count: HTMLSpanElement;
} => {
  const header = document.createElement('div');
  header.className = 'cp-section-header';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.setAttribute('aria-label', `Toute la table de ${a}`);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cp-section-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  const text = document.createElement('span');
  text.className = 'cp-section-name';
  text.textContent = `Table de ${a}`;
  const count = document.createElement('span');
  count.className = 'cp-section-count';
  const chevron = document.createElement('span');
  chevron.className = 'cp-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '▸';
  toggle.append(text, count, chevron);
  header.append(cb, toggle);
  return { header, cb, toggle, count };
};

const buildSectionRows = (
  a: number,
  op: Op,
  container: HTMLDivElement,
  has: Set<string>,
  out: HTMLInputElement[],
): HTMLInputElement[] => {
  const rows: HTMLInputElement[] = [];
  for (const b of MULTIPLIERS) {
    const { row, cb } = buildRow(a, b, op, has.has(pairKey(a, b, op)));
    container.appendChild(row);
    rows.push(cb);
    out.push(cb);
  }
  return rows;
};

const syncHeaderFromRows = (
  headerCb: HTMLInputElement,
  count: HTMLSpanElement,
  rows: readonly HTMLInputElement[],
): void => {
  const checkedCount = rows.filter((r) => r.checked).length;
  headerCb.checked = checkedCount === rows.length;
  headerCb.indeterminate = checkedCount > 0 && checkedCount < rows.length;
  count.textContent = `${checkedCount}/${rows.length}`;
};

const wireSectionToggle = (
  headerCb: HTMLInputElement,
  count: HTMLSpanElement,
  rows: readonly HTMLInputElement[],
): void => {
  syncHeaderFromRows(headerCb, count, rows);
  headerCb.addEventListener('change', () => {
    const target = headerCb.checked;
    for (const r of rows) {
      r.checked = target;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  for (const r of rows) {
    r.addEventListener('change', () => syncHeaderFromRows(headerCb, count, rows));
  }
};

/** Table repliée au départ : on la déplie pour choisir ses calculs un par un. */
const wireCollapse = (
  section: HTMLDivElement,
  toggle: HTMLButtonElement,
  rows: HTMLDivElement,
): void => {
  rows.hidden = true;
  toggle.addEventListener('click', () => {
    rows.hidden = !rows.hidden;
    toggle.setAttribute('aria-expanded', String(!rows.hidden));
    section.classList.toggle('cp-section-open', !rows.hidden);
  });
};

const buildSection = (
  a: number,
  op: Op,
  has: Set<string>,
  checkboxes: HTMLInputElement[],
): HTMLDivElement => {
  const section = document.createElement('div');
  section.className = 'cp-section';
  section.dataset.a = String(a);
  const { header, cb: headerCb, toggle, count } = buildSectionHeader(a);
  const rowsWrap = document.createElement('div');
  rowsWrap.className = 'cp-section-rows';
  section.append(header, rowsWrap);
  const rows = buildSectionRows(a, op, rowsWrap, has, checkboxes);
  wireSectionToggle(headerCb, count, rows);
  wireCollapse(section, toggle, rowsWrap);
  return section;
};

const buildRandomRow = (op: Op): { row: HTMLLabelElement; cb: HTMLInputElement } => {
  const row = document.createElement('label');
  row.className = 'cp-random-row';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.op = op;
  cb.dataset.random = 'true';
  const text = document.createElement('span');
  text.textContent = '10 questions aléatoires';
  row.append(cb, text);
  return { row, cb };
};

const buildBoundInput = (cls: string, value: number, label: string): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = 'number';
  input.inputMode = 'numeric';
  input.className = cls;
  input.min = String(TWO_DIGIT_MIN);
  input.max = String(TWO_DIGIT_MAX);
  input.value = String(value);
  input.setAttribute('aria-label', label);
  return input;
};

const clampBound = (raw: string, fallback: number, lo: number, hi: number): number => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && raw.trim() !== '' ? Math.max(lo, Math.min(hi, n)) : fallback;
};

/**
 * Bornes à 2 chiffres, le max au-dessus du min : la borne qu'on vient de régler est gardée,
 * l'autre s'écarte si besoin.
 */
const wireBounds = (
  cb: HTMLInputElement,
  minInput: HTMLInputElement,
  maxInput: HTMLInputElement,
): void => {
  const apply = (min: number, max: number): void => {
    minInput.value = cb.dataset.min = String(min);
    maxInput.value = cb.dataset.max = String(max);
    if (cb.checked) return;
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  };
  minInput.addEventListener('change', () => {
    const min = clampBound(
      minInput.value,
      Number(cb.dataset.min),
      TWO_DIGIT_MIN,
      TWO_DIGIT_MAX - 1,
    );
    apply(min, Math.max(min + 1, Number(cb.dataset.max)));
  });
  maxInput.addEventListener('change', () => {
    const max = clampBound(
      maxInput.value,
      Number(cb.dataset.max),
      TWO_DIGIT_MIN + 1,
      TWO_DIGIT_MAX,
    );
    apply(Math.min(max - 1, Number(cb.dataset.min)), max);
  });
};

/** Additions à 2 chiffres : une case et la fourchette des deux termes. */
const buildRangeBlock = (
  initial: AddRange | null,
): { block: HTMLDivElement; cb: HTMLInputElement } => {
  const { min, max } = initial ?? DEFAULT_ADD_RANGE;
  const block = document.createElement('div');
  block.className = 'cp-range';
  const head = document.createElement('label');
  head.className = 'cp-range-head';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = initial !== null;
  cb.dataset.op = 'add';
  cb.dataset.range = 'true';
  cb.dataset.min = String(min);
  cb.dataset.max = String(max);
  const title = document.createElement('span');
  title.textContent = 'Additions à 2 chiffres';
  head.append(cb, title);
  const bounds = document.createElement('div');
  bounds.className = 'cp-range-bounds';
  const minInput = buildBoundInput('cp-range-min', min, 'Plus petit nombre');
  const maxInput = buildBoundInput('cp-range-max', max, 'Plus grand nombre');
  bounds.append('Nombres de ', minInput, ' à ', maxInput);
  block.append(head, bounds);
  wireBounds(cb, minInput, maxInput);
  return { block, cb };
};

const tablesFor = (op: Op): readonly number[] => {
  if (op === 'mul') return MUL_TABLES;
  if (op === 'add') return ADD_TABLES;
  return SUB_TABLES;
};

export const buildOpPanel = (
  op: Op,
  has: Set<string>,
  checkboxes: HTMLInputElement[],
  addRange: AddRange | null = null,
): OpPanelHandles => {
  const panel = document.createElement('div');
  panel.className = 'cp-panel';
  panel.dataset.op = op;
  const { row: randomRow, cb: randomCb } = buildRandomRow(op);
  panel.appendChild(randomRow);
  const pairCbs: HTMLInputElement[] = [];
  for (const a of tablesFor(op)) {
    panel.appendChild(buildSection(a, op, has, pairCbs));
  }
  pairCbs.forEach((cb) => checkboxes.push(cb));
  let rangeCb: HTMLInputElement | null = null;
  if (op === 'add') {
    const { block, cb } = buildRangeBlock(addRange);
    panel.appendChild(block);
    checkboxes.push(cb);
    rangeCb = cb;
  }
  return { panel, randomCb, pairCbs, rangeCb };
};
