import { describe, it, expect } from 'vitest';
import { campOf, clampToCamp, createWinDetector } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import { DESIGN_WIDTH, MAX_STRETCH, MID_Y, PUCK_RADIUS } from '../../src/config/dimensions';

describe('campOf', () => {
  it('sous la ligne médiane → A, au-dessus → B', () => {
    expect(campOf(MID_Y + 1)).toBe('A');
    expect(campOf(MID_Y - 1)).toBe('B');
  });
});

describe('clampToCamp', () => {
  it('garde le palet dans la largeur du plateau', () => {
    expect(clampToCamp({ x: -50, y: 900 }, 'A').x).toBe(PUCK_RADIUS);
    expect(clampToCamp({ x: 900, y: 900 }, 'A').x).toBe(DESIGN_WIDTH - PUCK_RADIUS);
  });

  it('confine le palet tenu à la moitié arrière de son camp', () => {
    const minA = (MID_Y + elasticLine('A').y) / 2;
    expect(clampToCamp({ x: 360, y: 100 }, 'A').y).toBe(minA);
    const maxB = (MID_Y + elasticLine('B').y) / 2;
    expect(clampToCamp({ x: 360, y: 1200 }, 'B').y).toBe(maxB);
  });

  it('autorise l’étirement jusqu’à MAX_STRETCH, pas au-delà', () => {
    expect(clampToCamp({ x: 360, y: 5000 }, 'A').y).toBe(elasticLine('A').y + MAX_STRETCH);
    expect(clampToCamp({ x: 360, y: -5000 }, 'B').y).toBe(elasticLine('B').y - MAX_STRETCH);
  });
});

describe('createWinDetector', () => {
  it('camp vide moins d’1 s → pas de vainqueur', () => {
    const d = createWinDetector();
    expect(d.update({ A: 0, B: 10 }, 600)).toBeNull();
    expect(d.update({ A: 0, B: 10 }, 300)).toBeNull();
  });

  it('camp vide 1 s d’affilée → ce joueur gagne, et reste vainqueur', () => {
    const d = createWinDetector();
    d.update({ A: 0, B: 10 }, 600);
    expect(d.update({ A: 0, B: 10 }, 400)).toBe('A');
    expect(d.update({ A: 3, B: 7 }, 16)).toBe('A');
  });

  it('palet revenu par rebond → le délai repart de zéro', () => {
    const d = createWinDetector();
    d.update({ A: 0, B: 10 }, 900);
    d.update({ A: 1, B: 9 }, 16);
    expect(d.update({ A: 0, B: 10 }, 900)).toBeNull();
    expect(d.update({ A: 0, B: 10 }, 100)).toBe('A');
  });

  it('B peut gagner aussi', () => {
    const d = createWinDetector();
    expect(d.update({ A: 10, B: 0 }, 1000)).toBe('B');
  });

  it('reset efface le vainqueur et les délais (Rejouer)', () => {
    const d = createWinDetector();
    d.update({ A: 0, B: 10 }, 1000);
    d.reset();
    expect(d.update({ A: 5, B: 5 }, 16)).toBeNull();
  });
});
