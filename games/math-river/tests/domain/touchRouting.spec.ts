import { describe, it, expect } from 'vitest';
import { createTouchRouter, sideOf } from '../../src/domain/touchRouting';
import { MID_Y } from '../../src/config/dimensions';

describe('touchRouting', () => {
  it('moitié basse → A, haute → B', () => {
    expect(sideOf(MID_Y + 10)).toBe('A');
    expect(sideOf(MID_Y - 10)).toBe('B');
  });

  it('deux joueurs simultanés ; 2ᵉ doigt d’un même joueur ignoré ; relâcher libère', () => {
    const r = createTouchRouter();
    expect(r.begin(1, MID_Y + 100)).toBe('A');
    expect(r.begin(2, MID_Y - 100)).toBe('B');
    expect(r.begin(3, MID_Y + 200)).toBeNull();
    expect(r.owner(2)).toBe('B');
    r.end(1);
    expect(r.owner(1)).toBeNull();
    expect(r.begin(3, MID_Y + 200)).toBe('A');
  });
});
