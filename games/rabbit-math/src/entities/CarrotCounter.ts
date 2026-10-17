import { Container, Sprite, Texture } from 'pixi.js';
import { ASSET_URLS } from '../assets';
import { COUNTER_FIRST_X, COUNTER_GAP, COUNTER_TILT_DEG, COUNTER_Y } from '../config/dimensions';

export interface CarrotCounter {
  readonly view: Container;
  setRemaining(n: number): void;
  remaining(): number;
}

const CARROT_URL = ASSET_URLS.carrot;
const ICON_WIDTH = 22 * 0.75;
const ICON_HEIGHT = (ICON_WIDTH * 631) / 248;

const buildIcons = (total: number): Sprite[] => {
  const icons: Sprite[] = [];
  for (let i = 0; i < total; i++) {
    const sprite = new Sprite(Texture.from(CARROT_URL));
    sprite.anchor.set(0.5);
    sprite.width = ICON_WIDTH;
    sprite.height = ICON_HEIGHT;
    sprite.position.set(COUNTER_FIRST_X + i * COUNTER_GAP, COUNTER_Y);
    sprite.rotation = (COUNTER_TILT_DEG * Math.PI) / 180;
    icons.push(sprite);
  }
  return icons;
};

export function createCarrotCounter(total: number): CarrotCounter {
  const view = new Container();
  const icons = buildIcons(total);
  for (const s of icons) view.addChild(s);
  let current = total;
  return {
    view,
    remaining: () => current,
    setRemaining: (n) => {
      current = Math.max(0, Math.min(total, n));
      icons.forEach((s, i) => {
        s.alpha = i < current ? 1 : 0;
      });
    },
  };
}
