import { describe, it, expect } from 'vitest';
import { campOf, clampToCamp, createWinDetector } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import {
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MAX_STRETCH,
  MID_Y,
  NO_DRAG_RADIUS,
  PUCK_RADIUS,
} from '../../src/config/dimensions';

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

  // Zone interdite : demi-cercle de rayon NO_DRAG_RADIUS centré sur le passage ; le palet tenu
  // reste entièrement dehors (son centre à NO_DRAG_RADIUS + PUCK_RADIUS au moins).
  const gap = { x: DESIGN_WIDTH / 2, y: MID_Y };
  const fromGap = (p: { x: number; y: number }) => Math.hypot(p.x - gap.x, p.y - gap.y);
  const LIMIT = NO_DRAG_RADIUS + PUCK_RADIUS;

  it('repousse le palet tenu hors du demi-cercle autour du passage, sur son bord', () => {
    for (const pl of ['A', 'B'] as const) {
      const dir = pl === 'A' ? 1 : -1;
      for (const target of [
        { x: 360, y: MID_Y + dir * 60 },
        { x: 300, y: MID_Y + dir * 150 },
        { x: 470, y: MID_Y + dir * 100 },
      ]) {
        const p = clampToCamp(target, pl);
        expect(fromGap(p)).toBeCloseTo(LIMIT, 6);
        expect(campOf(p.y)).toBe(pl);
      }
    }
  });

  it('le palet est repoussé dans l’axe du passage (même direction)', () => {
    const p = clampToCamp({ x: 300, y: MID_Y + 150 }, 'A');
    const a = Math.atan2(150, -60);
    expect(Math.atan2(p.y - gap.y, p.x - gap.x)).toBeCloseTo(a, 6);
  });

  it('hors du demi-cercle, le palet peut monter jusqu’à la cloison (plus de ligne à mi-camp)', () => {
    const nearDivider = MID_Y + DIVIDER_THICKNESS / 2 + PUCK_RADIUS;
    expect(clampToCamp({ x: 60, y: nearDivider + 2 }, 'A')).toEqual({ x: 60, y: nearDivider + 2 });
    expect(
      clampToCamp({ x: 660, y: MID_Y - DIVIDER_THICKNESS / 2 - PUCK_RADIUS - 2 }, 'B'),
    ).toEqual({ x: 660, y: MID_Y - DIVIDER_THICKNESS / 2 - PUCK_RADIUS - 2 });
  });

  it('ne passe jamais dans l’autre camp ni sur la cloison', () => {
    expect(clampToCamp({ x: 60, y: 100 }, 'A').y).toBe(MID_Y + DIVIDER_THICKNESS / 2 + PUCK_RADIUS);
    expect(clampToCamp({ x: 660, y: 1200 }, 'B').y).toBe(
      MID_Y - DIVIDER_THICKNESS / 2 - PUCK_RADIUS,
    );
  });

  it('autorise l’étirement jusqu’à MAX_STRETCH, pas au-delà', () => {
    expect(clampToCamp({ x: 360, y: 5000 }, 'A').y).toBe(
      elasticLine('A').y + MAX_STRETCH - PUCK_RADIUS,
    );
    expect(clampToCamp({ x: 360, y: -5000 }, 'B').y).toBe(
      elasticLine('B').y - MAX_STRETCH + PUCK_RADIUS,
    );
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
