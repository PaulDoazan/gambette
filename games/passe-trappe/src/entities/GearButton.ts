import { Circle, Container, Graphics } from 'pixi.js';
import { GEAR } from '../config/dimensions';
import { COLORS } from '../config/theme';

export interface GearButton {
  readonly view: Container;
}

const TEETH = 8;

export function createGearButton(onTap: () => void): GearButton {
  const view = new Container();
  view.label = 'gear';
  view.position.set(GEAR.x, GEAR.y);
  view.eventMode = 'static';
  view.cursor = 'pointer';
  view.hitArea = new Circle(0, 0, GEAR.r + 10);
  const toothW = GEAR.r * 0.34;
  for (let i = 0; i < TEETH; i++) {
    const tooth = new Graphics().rect(-toothW / 2, -GEAR.r, toothW, GEAR.r / 2).fill(COLORS.button);
    tooth.rotation = (i * 2 * Math.PI) / TEETH;
    view.addChild(tooth);
  }
  const hub = new Graphics()
    .circle(0, 0, GEAR.r * 0.72)
    .fill(COLORS.button)
    .circle(0, 0, GEAR.r * 0.28)
    .fill(COLORS.calcText);
  view.addChild(hub);
  view.on('pointertap', onTap);
  return { view };
}
