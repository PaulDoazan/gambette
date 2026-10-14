import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RECORD_KEY, loadRecord, saveRecord } from '../src/record';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('record local', () => {
  it('vaut 0 sans donnée', () => {
    expect(loadRecord()).toBe(0);
  });

  it('aller-retour', () => {
    saveRecord(12);
    expect(localStorage.getItem(RECORD_KEY)).toBe('12');
    expect(loadRecord()).toBe(12);
  });

  it('donnée invalide → 0', () => {
    for (const raw of ['abc', '-3', '2.5', '']) {
      localStorage.setItem(RECORD_KEY, raw);
      expect(loadRecord()).toBe(0);
    }
  });

  it('localStorage qui lève → 0 en lecture, écriture ignorée sans erreur', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadRecord()).toBe(0);
    expect(() => saveRecord(5)).not.toThrow();
  });
});
