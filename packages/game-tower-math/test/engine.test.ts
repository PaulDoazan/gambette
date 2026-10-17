import { describe, it, expect } from 'vitest';
import { createTowerEngine } from '../src/engine';

describe('createTowerEngine', () => {
  it('start pose la fondation et le premier pavé mobile', () => {
    const engine = createTowerEngine();
    const { foundation, first } = engine.start();
    expect(foundation).toMatchObject({ index: 0, x: 0, z: 0, width: 3, depth: 3 });
    expect(first).toMatchObject({ index: 1, x: -7.5, z: 0, width: 3, depth: 3, direction: 'x' });
    expect(engine.status).toBe('playing');
    expect(engine.score).toBe(0);
    expect(engine.current()).toEqual(first);
  });

  it('slice avec chevauchement renvoie la découpe et incrémente le score', () => {
    const engine = createTowerEngine();
    engine.start();
    // Pavé mobile (largeur 3) cliqué à x=1 au-dessus de la fondation (x=0) → delta=1, overlap=2.
    const result = engine.slice(1);
    expect(result.type).toBe('sliced');
    if (result.type !== 'sliced') return;
    expect(engine.score).toBe(1);
    expect(result.cut.newWidth).toBe(2);
    expect(result.cut.newDepth).toBe(3);
    expect(result.cut.shift).toBe(-0.5); // recentrage : centre 1 → 0.5
    // Chute du côté du décalage (delta > 0 → +x) : centre = 0.5 + (2/2 + 1/2) = 2
    expect(result.cut.overhang).toEqual({ x: 2, z: 0, width: 1, depth: 3 });
    // Pavé suivant : axe alterné z, aligné en x sur le pavé posé, spawn z = -5
    expect(result.cut.next).toEqual({
      index: 2,
      x: 0.5,
      z: -5,
      width: 2,
      depth: 3,
      direction: 'z',
    });
    expect(engine.current()).toEqual(result.cut.next);
  });

  it('la chute part du bon côté quand delta est négatif', () => {
    const engine = createTowerEngine();
    engine.start();
    const result = engine.slice(-1);
    if (result.type !== 'sliced') throw new Error('expected sliced');
    expect(result.cut.shift).toBe(0.5);
    expect(result.cut.overhang).toEqual({ x: -2, z: 0, width: 1, depth: 3 });
  });

  it('découpe parfaite (delta=0) → chute de largeur nulle', () => {
    const engine = createTowerEngine();
    engine.start();
    const result = engine.slice(0);
    if (result.type !== 'sliced') throw new Error('expected sliced');
    expect(result.cut.newWidth).toBe(3);
    expect(result.cut.overhang.width).toBe(0);
  });

  it('slice sans chevauchement → missed + lost, score inchangé', () => {
    const engine = createTowerEngine();
    engine.start();
    const result = engine.slice(3); // décalage = taille → overlap 0
    expect(result).toEqual({ type: 'missed' });
    expect(engine.status).toBe('lost');
    expect(engine.score).toBe(0);
  });

  it('fail force la défaite sans découpe', () => {
    const engine = createTowerEngine();
    engine.start();
    engine.fail();
    expect(engine.status).toBe('lost');
    expect(engine.score).toBe(0);
  });

  it("alterne l'axe x→z→x sur plusieurs découpes", () => {
    const engine = createTowerEngine();
    engine.start();
    expect(engine.current().direction).toBe('x');
    engine.slice(0.5);
    expect(engine.current().direction).toBe('z');
    engine.slice(0.25); // étage précédent en z=0 → delta=0.25, overlap ok
    expect(engine.current().direction).toBe('x');
    expect(engine.score).toBe(2);
  });

  it('la 2e découpe (axe z) se mesure contre la position z du pavé posé', () => {
    const engine = createTowerEngine();
    engine.start();
    engine.slice(1); // pavé posé : x=0.5, z=0, 2×3
    const result = engine.slice(0.5); // axe z : delta = 0.5 - 0 = 0.5, depth 3 → overlap 2.5
    if (result.type !== 'sliced') throw new Error('expected sliced');
    expect(result.cut.newWidth).toBe(2);
    expect(result.cut.newDepth).toBe(2.5);
    expect(result.cut.overhang.x).toBe(0.5); // aligné sur le pavé posé
    expect(result.cut.next).toMatchObject({ index: 3, x: -5, z: 0.25, direction: 'x' });
  });

  it('start après une défaite relance une partie propre', () => {
    const engine = createTowerEngine();
    engine.start();
    engine.fail();
    engine.start();
    expect(engine.status).toBe('playing');
    expect(engine.score).toBe(0);
    expect(engine.current().index).toBe(1);
  });
});
