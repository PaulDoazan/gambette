import { Container, Graphics } from 'pixi.js';
import { FULLSCREEN_BTN_POS, FULLSCREEN_BTN_RADIUS } from '../config/dimensions';
import { COLORS, STROKE } from '../config/theme';

export interface FullscreenButton {
  readonly view: Container;
}

const BODY_RADIUS = FULLSCREEN_BTN_RADIUS;
const CORNER_REACH = 11;
const CORNER_LENGTH = 7;

const drawCorner = (g: Graphics, x: number, y: number, dx: number, dy: number): void => {
  g.moveTo(x, y)
    .lineTo(x + dx * CORNER_LENGTH, y)
    .moveTo(x, y)
    .lineTo(x, y + dy * CORNER_LENGTH)
    .stroke({ width: STROKE.thick, color: COLORS.outline, cap: 'round' });
};

const drawCorners = (g: Graphics): void => {
  drawCorner(g, -CORNER_REACH, -CORNER_REACH, +1, +1);
  drawCorner(g, +CORNER_REACH, -CORNER_REACH, -1, +1);
  drawCorner(g, -CORNER_REACH, +CORNER_REACH, +1, -1);
  drawCorner(g, +CORNER_REACH, +CORNER_REACH, -1, -1);
};

const drawBody = (g: Graphics): void => {
  g.circle(0, 0, BODY_RADIUS)
    .fill(COLORS.cogBody)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
};

export function createFullscreenButton(opts: { onTap: () => void }): FullscreenButton {
  const view = new Container();
  view.position.set(FULLSCREEN_BTN_POS.x, FULLSCREEN_BTN_POS.y);
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const g = new Graphics();
  drawBody(g);
  drawCorners(g);
  view.addChild(g);
  view.on('pointerup', opts.onTap);
  return { view };
}
