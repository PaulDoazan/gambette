import { describe, it, expect } from 'vitest';
import { createTouchRouter } from '../../src/domain/touchRouting';
import { MID_Y } from '../../src/config/dimensions';

const BOTTOM = MID_Y + 200;
const TOP = MID_Y - 200;

describe('createTouchRouter', () => {
  it('un toucher appartient à la moitié où il commence', () => {
    const r = createTouchRouter();
    expect(r.begin(1, BOTTOM)).toBe('A');
    expect(r.begin(2, TOP)).toBe('B');
    expect(r.owner(1)).toBe('A');
    expect(r.owner(2)).toBe('B');
  });

  it('un second doigt du même joueur est ignoré', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    expect(r.begin(2, BOTTOM + 50)).toBeNull();
    expect(r.owner(2)).toBeNull();
  });

  it('relâcher libère le joueur', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    r.end(1);
    expect(r.owner(1)).toBeNull();
    expect(r.begin(3, BOTTOM)).toBe('A');
  });

  it('end d’un doigt ignoré ne libère pas le doigt actif', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    r.begin(2, BOTTOM);
    r.end(2);
    expect(r.owner(1)).toBe('A');
  });

  it('reset libère tout', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    r.begin(2, TOP);
    r.reset();
    expect(r.begin(5, BOTTOM)).toBe('A');
    expect(r.begin(6, TOP)).toBe('B');
  });
});
