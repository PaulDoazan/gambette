import { shuffle, type Rng } from './rng';

export type Op = 'mul' | 'add' | 'sub';

export type TableListId =
  | 'table_2'
  | 'table_5'
  | 'table_10'
  | 'tables_2_5_10'
  | 'tables_3_4_6'
  | 'tables_7_8_9'
  | 'tables_all'
  | 'squares';

export interface Pair {
  readonly a: number;
  readonly b: number;
  readonly op: Op;
}

export interface TableList {
  readonly id: TableListId;
  readonly label: string;
  readonly pairs: readonly Pair[];
}

const range = (lo: number, hi: number): number[] =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

const tablePairs = (multipliers: number[], op: Op = 'mul'): Pair[] =>
  multipliers.flatMap((a) => range(1, 10).map((b) => ({ a, b, op })));

const squarePairs = (): Pair[] => range(2, 10).map((n) => ({ a: n, b: n, op: 'mul' as Op }));

export const allMulPairs = (): Pair[] => tablePairs(range(2, 10), 'mul');
export const allAddPairs = (): Pair[] => tablePairs(range(1, 10), 'add');
export const allSubPairs = (): Pair[] => tablePairs(range(1, 10), 'sub');
export const allPairs = (): Pair[] => allMulPairs();

export const computeAnswer = (p: Pair): number => {
  if (p.op === 'mul') return p.a * p.b;
  if (p.op === 'add') return p.a + p.b;
  return p.a - p.b;
};

export const opSymbol = (op: Op): string => {
  if (op === 'mul') return '×';
  if (op === 'add') return '+';
  return '−';
};

export const TABLE_LISTS: Readonly<Record<TableListId, TableList>> = {
  table_2: { id: 'table_2', label: 'Table de 2', pairs: tablePairs([2]) },
  table_5: { id: 'table_5', label: 'Table de 5', pairs: tablePairs([5]) },
  table_10: { id: 'table_10', label: 'Table de 10', pairs: tablePairs([10]) },
  tables_2_5_10: {
    id: 'tables_2_5_10',
    label: 'Tables faciles',
    pairs: tablePairs([2, 5, 10]),
  },
  tables_3_4_6: {
    id: 'tables_3_4_6',
    label: 'Tables moyennes',
    pairs: tablePairs([3, 4, 6]),
  },
  tables_7_8_9: {
    id: 'tables_7_8_9',
    label: 'Tables difficiles',
    pairs: tablePairs([7, 8, 9]),
  },
  tables_all: {
    id: 'tables_all',
    label: 'Toutes les tables',
    pairs: tablePairs(range(2, 10)),
  },
  squares: { id: 'squares', label: 'Carrés parfaits', pairs: squarePairs() },
};

export function getTableList(id: TableListId): TableList {
  const list = TABLE_LISTS[id];
  if (!list) throw new Error(`Unknown table list: ${String(id)}`);
  return list;
}

/** Tirage de `count` multiplications distinctes (sélection par défaut des jeux). */
export function randomMulPairs(count = 10, rng: Rng = Math.random): Pair[] {
  return shuffle(allMulPairs(), rng).slice(0, count);
}
