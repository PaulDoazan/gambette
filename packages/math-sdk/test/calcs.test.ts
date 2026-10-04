import { describe, it, expect } from 'vitest';
import { TABLE_LISTS, getTableList, type TableListId } from '../src/domain/calcs';

describe('TABLE_LISTS shape', () => {
  it('has exactly 8 lists', () => {
    expect(Object.keys(TABLE_LISTS)).toHaveLength(8);
  });

  it('includes all expected ids', () => {
    const ids: TableListId[] = [
      'table_2',
      'table_5',
      'table_10',
      'tables_2_5_10',
      'tables_3_4_6',
      'tables_7_8_9',
      'tables_all',
      'squares',
    ];
    for (const id of ids) expect(TABLE_LISTS[id]).toBeDefined();
  });
});

describe('table_2', () => {
  it('contains 2x1..2x10', () => {
    const list = getTableList('table_2');
    expect(list.pairs).toHaveLength(10);
    expect(list.pairs[0]).toEqual({ a: 2, b: 1, op: 'mul' });
    expect(list.pairs[9]).toEqual({ a: 2, b: 10, op: 'mul' });
  });
});

describe('squares', () => {
  it('contains n*n for n in 2..10', () => {
    const list = getTableList('squares');
    expect(list.pairs).toEqual([
      { a: 2, b: 2, op: 'mul' },
      { a: 3, b: 3, op: 'mul' },
      { a: 4, b: 4, op: 'mul' },
      { a: 5, b: 5, op: 'mul' },
      { a: 6, b: 6, op: 'mul' },
      { a: 7, b: 7, op: 'mul' },
      { a: 8, b: 8, op: 'mul' },
      { a: 9, b: 9, op: 'mul' },
      { a: 10, b: 10, op: 'mul' },
    ]);
  });
});

describe('tables_all', () => {
  it('has 9*10 = 90 pairs', () => {
    const list = getTableList('tables_all');
    expect(list.pairs).toHaveLength(90);
  });

  it('contains 90 unique pairs', () => {
    const list = getTableList('tables_all');
    const keys = list.pairs.map((p) => `${p.a}x${p.b}`);
    expect(new Set(keys).size).toBe(90);
  });
});

describe('each list', () => {
  it('has matching id and a non-empty label', () => {
    for (const [key, list] of Object.entries(TABLE_LISTS)) {
      expect(list.id).toBe(key);
      expect(list.label.length).toBeGreaterThan(0);
    }
  });
});

describe('getTableList', () => {
  it('throws an explanatory message on unknown id', () => {
    expect(() => getTableList('nope' as TableListId)).toThrow(/Unknown table list: nope/);
  });
});

import { randomMulPairs } from '../src/domain/calcs';
import { mulberry32 } from '../src/domain/rng';

describe('randomMulPairs', () => {
  it('renvoie 10 multiplications distinctes par défaut', () => {
    const pairs = randomMulPairs();
    expect(pairs).toHaveLength(10);
    expect(pairs.every((p) => p.op === 'mul')).toBe(true);
    expect(new Set(pairs.map((p) => `${p.a}x${p.b}`)).size).toBe(10);
  });

  it('est déterministe avec un rng fourni', () => {
    expect(randomMulPairs(5, mulberry32(42))).toEqual(randomMulPairs(5, mulberry32(42)));
  });
});
