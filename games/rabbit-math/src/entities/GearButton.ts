import { Container, Sprite, Texture } from 'pixi.js';
import { ASSET_URLS } from '../assets';
import { GEAR_POS, GEAR_RADIUS } from '../config/dimensions';

export interface GearButton {
  readonly view: Container;
}

const COG_URL = ASSET_URLS.cog;
const COG_SIZE = GEAR_RADIUS * 3;

export function createGearButton(opts: { onTap: () => void }): GearButton {
  const view = new Container();
  view.position.set(GEAR_POS.x, GEAR_POS.y);
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const sprite = new Sprite(Texture.from(COG_URL));
  sprite.anchor.set(0.5);
  sprite.width = COG_SIZE;
  sprite.height = COG_SIZE;
  view.addChild(sprite);
  view.on('pointerup', opts.onTap);
  return { view };
}
