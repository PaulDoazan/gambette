import { describe, it, expect, afterEach } from 'vitest';
import type { Text } from 'pixi.js';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createPuck } from '../../src/entities/Puck';
import { MID_Y } from '../../src/config/dimensions';
import { VIBRATE_MS } from '../../src/config/physics';

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

describe('Puck — vibration', () => {
  it('oscille autour de la position physique puis s’arrête', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.vibrate(VIBRATE_MS);
    expect(p.isVibrating()).toBe(true);
    let moved = false;
    for (let t = 0; t < VIBRATE_MS; t += 16) {
      p.syncView(16);
      if (Math.abs(p.view.x - p.position().x) > 0.5) moved = true;
    }
    expect(moved).toBe(true);
    p.syncView(16);
    expect(p.isVibrating()).toBe(false);
    expect(p.view.x).toBeCloseTo(p.position().x, 6);
  });
});
