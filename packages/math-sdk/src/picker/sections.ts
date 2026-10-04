import type { Op, Pair } from '../domain/calcs';

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
}

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

const buildSectionHeader = (a: number): { header: HTMLLabelElement; cb: HTMLInputElement } => {
  const header = document.createElement('label');
  header.className = 'cp-section-header';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  const text = document.createElement('span');
  text.textContent = `Table de ${a}`;
  header.append(cb, text);
  return { header, cb };
};

const buildSectionRows = (
  a: number,
  op: Op,
  section: HTMLDivElement,
  has: Set<string>,
  out: HTMLInputElement[],
): HTMLInputElement[] => {
  const rows: HTMLInputElement[] = [];
  for (const b of MULTIPLIERS) {
    const { row, cb } = buildRow(a, b, op, has.has(pairKey(a, b, op)));
    section.appendChild(row);
    rows.push(cb);
    out.push(cb);
  }
  return rows;
};

const syncHeaderFromRows = (
  headerCb: HTMLInputElement,
  rows: readonly HTMLInputElement[],
): void => {
  const checkedCount = rows.filter((r) => r.checked).length;
  headerCb.checked = checkedCount === rows.length;
  headerCb.indeterminate = checkedCount > 0 && checkedCount < rows.length;
};

const wireSectionToggle = (headerCb: HTMLInputElement, rows: readonly HTMLInputElement[]): void => {
  syncHeaderFromRows(headerCb, rows);
  headerCb.addEventListener('change', () => {
    const target = headerCb.checked;
    for (const r of rows) {
      r.checked = target;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  for (const r of rows) {
    r.addEventListener('change', () => syncHeaderFromRows(headerCb, rows));
  }
};

const buildSection = (
  a: number,
  op: Op,
  has: Set<string>,
  checkboxes: HTMLInputElement[],
): HTMLDivElement => {
  const section = document.createElement('div');
  section.className = 'cp-section';
  const { header, cb: headerCb } = buildSectionHeader(a);
  section.appendChild(header);
  const rows = buildSectionRows(a, op, section, has, checkboxes);
  wireSectionToggle(headerCb, rows);
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

const tablesFor = (op: Op): readonly number[] => {
  if (op === 'mul') return MUL_TABLES;
  if (op === 'add') return ADD_TABLES;
  return SUB_TABLES;
};

export const buildOpPanel = (
  op: Op,
  has: Set<string>,
  checkboxes: HTMLInputElement[],
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
  return { panel, randomCb, pairCbs };
};
