import { describe, it, expect, afterEach } from 'vitest';
import type { Container, Text } from 'pixi.js';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createPuck } from '../../src/entities/Puck';
import { FLIP_MS } from '../../src/config/physics';
import { MID_Y } from '../../src/config/dimensions';
import { BURST_MS } from '../../src/entities/Burst';

let physics: PhysicsWorld;
afterEach(() => physics.destroy());

const labelText = (view: Container): Text => view.getChildByLabel('value', true) as Text;

describe('Puck — étiquette', () => {
  it('affiche la valeur et la retire', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.setLabel(48);
    expect(p.label()).toBe(48);
    expect(labelText(p.view).text).toBe('48');
    p.setLabel(null);
    expect(labelText(p.view).text).toBe('');
  });

  it('droite pour le joueur du camp : 0 en A, π en B, malgré la rotation du palet', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.setLabel(12);
    p.body.setAngle(1.2);
    p.syncView();
    expect(p.view.rotation + labelText(p.view).rotation).toBeCloseTo(0, 6);
    p.setPosition({ x: 360, y: MID_Y - 200 });
    p.syncView();
    expect(p.view.rotation + labelText(p.view).rotation).toBeCloseTo(Math.PI, 6);
  });
});

describe('Puck — retournement (mauvais palet)', () => {
  it('décolle, se retourne comme une pièce et atterrit à sa position physique', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 950 });
    p.flip({ x: 360, y: 1150 });
    expect(p.isFlipping()).toBe(true);
    const face = p.view.getChildByLabel('face', true) as Container;
    const edge = p.view.getChildByLabel('edge', true) as Container;
    let maxScale = 0;
    let negativeFace = false;
    let between = false;
    let edgeSeen = false;
    for (let t = 0; t < FLIP_MS; t += 16) {
      p.syncView(16);
      maxScale = Math.max(maxScale, p.view.scale.x);
      expect(p.view.scale.y).toBeCloseTo(p.view.scale.x, 6); // saut : agrandissement uniforme
      if (face.scale.y < 0) negativeFace = true;
      if (edge.visible && edge.height > 4) edgeSeen = true; // tranche visible de profil
      if (p.view.y > 960 && p.view.y < 1140) between = true;
    }
    expect(maxScale).toBeGreaterThan(1.2);
    expect(negativeFace).toBe(true);
    expect(edgeSeen).toBe(true);
    expect(between).toBe(true);
    p.syncView(16);
    expect(p.isFlipping()).toBe(false);
    expect(p.view.position.x).toBeCloseTo(360, 6);
    expect(p.view.position.y).toBeCloseTo(950, 6);
    expect(p.view.scale.x).toBeCloseTo(1, 6);
    expect(face.scale.y).toBeCloseTo(1, 6);
    expect(edge.visible).toBe(false);
  });

  it('au début du retournement, la vue part du point de relâcher', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 950 });
    p.flip({ x: 300, y: 1150 });
    p.syncView(0);
    expect(p.view.position.x).toBeCloseTo(300, 6);
    expect(p.view.position.y).toBeCloseTo(1150, 6);
  });
});

describe('Puck — éclat du chiffre', () => {
  it('flash() fait gonfler le chiffre puis le ramène à la normale', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.setLabel(42);
    expect(p.isFlashing()).toBe(false);
    p.flash();
    expect(p.isFlashing()).toBe(true);
    p.syncView(BURST_MS * 0.25);
    expect(labelText(p.view).scale.x).toBeGreaterThan(1.3);
    expect(p.view.getChildByLabel('burst', true)!.visible).toBe(true);
    // Étincelles hors de la vue du palet (calque au-dessus de tous les palets), placées sur lui.
    expect(p.view.getChildByLabel('sparks', true)).toBeNull();
    expect(p.sparks.visible).toBe(true);
    expect(p.sparks.position.x).toBe(p.view.position.x);
    expect(p.sparks.position.y).toBe(p.view.position.y);
    p.syncView(BURST_MS);
    expect(p.sparks.visible).toBe(false);
    expect(p.isFlashing()).toBe(false);
    expect(labelText(p.view).scale.x).toBe(1);
    expect(labelText(p.view).tint).toBe(0xffffff);
    expect(p.view.getChildByLabel('burst', true)!.visible).toBe(false);
  });
});
