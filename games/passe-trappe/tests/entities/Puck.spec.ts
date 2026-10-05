import { describe, it, expect, afterEach } from 'vitest';
import type { Text } from 'pixi.js';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createPuck } from '../../src/entities/Puck';
import { MID_Y } from '../../src/config/dimensions';

let physics: PhysicsWorld;
afterEach(() => physics.destroy());

const labelText = (view: { children: unknown[] }): Text =>
  (view.children as Array<{ label?: string }>).find((c) => c.label === 'value') as unknown as Text;

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
