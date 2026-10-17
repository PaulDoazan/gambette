import { describe, it, expect, beforeEach } from 'vitest';
import { readJson, writeJson, removeKey } from '../../src/services/Storage';

beforeEach(() => localStorage.clear());

describe('Storage', () => {
  it('returns null when key is absent', () => {
    expect(readJson('k')).toBeNull();
  });

  it('round-trips a JSON-serialisable value', () => {
    writeJson('k', { a: 1, b: [2, 3] });
    expect(readJson('k')).toEqual({ a: 1, b: [2, 3] });
  });

  it('returns null when the stored value is invalid JSON', () => {
    localStorage.setItem('k', '{not json');
    expect(readJson('k')).toBeNull();
  });

  it('removeKey deletes the entry', () => {
    writeJson('k', 1);
    removeKey('k');
    expect(readJson('k')).toBeNull();
  });
});
