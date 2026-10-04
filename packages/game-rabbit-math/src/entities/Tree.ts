import { Container, Sprite, Texture } from 'pixi.js';
import { ASSET_URLS } from '../assets';
import { GROUND_Y, TREE_TRUNK_X } from '../config/dimensions';
import type { RabbitsCount } from '../services/Settings';

export interface Tree {
  readonly view: Container;
}

const TREE_SCALE = 1.15;
const TREE_WIDTH = 470 * TREE_SCALE;
const TREE_HEIGHT = (TREE_WIDTH * 500) / 701;
const TREE_OFFSET_X = -TREE_WIDTH * 0.05;
const TREE_OFFSET_Y = TREE_HEIGHT * 0.125;

const TREE_URL_BY_COUNT: Record<RabbitsCount, string> = {
  4: ASSET_URLS.tree4,
  5: ASSET_URLS.tree5,
  6: ASSET_URLS.tree6,
  7: ASSET_URLS.tree7,
  8: ASSET_URLS.tree7,
};

export function createTree(rabbitsCount: RabbitsCount): Tree {
  const view = new Container();
  const sprite = new Sprite(Texture.from(TREE_URL_BY_COUNT[rabbitsCount]));
  sprite.anchor.set(0.5, 1);
  sprite.width = TREE_WIDTH;
  sprite.height = TREE_HEIGHT;
  sprite.x = TREE_TRUNK_X + TREE_OFFSET_X;
  sprite.y = GROUND_Y + TREE_OFFSET_Y;
  view.addChild(sprite);
  return { view };
}
