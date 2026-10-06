import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ASSET_URLS } from '../assets';
import { SLINGSHOT_ANCHOR, GROUND_Y } from '../config/dimensions';
import { SLINGSHOT_MAX_PULL, SLINGSHOT_POWER } from '../config/physics';

export interface Vec {
  x: number;
  y: number;
}

export interface Slingshot {
  readonly view: Container;
  anchor(): Vec;
  carrotPosition(): Vec;
  aimAt(point: Vec): void;
  releaseVelocity(): Vec;
  reset(): void;
  drawElasticTo(carrot: Vec): void;
  clearElastic(): void;
}

const WEAPON_URL = ASSET_URLS.weapon;
const WEAPON_SOURCE_RATIO = 1456 / 720;
const SPRITE_SCALE = 1.2;
const SPRITE_BASE_WIDTH = 50;
const SPRITE_WIDTH = SPRITE_BASE_WIDTH * SPRITE_SCALE;
const SPRITE_HEIGHT = SPRITE_WIDTH * WEAPON_SOURCE_RATIO;
const SPRITE_BASE_HEIGHT = SPRITE_BASE_WIDTH * WEAPON_SOURCE_RATIO;
const SPRITE_ANCHOR_Y = 0.21;
const ELASTIC_RAISE = 50;
const SLINGSHOT_EXTRA_RAISE = 15;
const PRONG_TIP_X_INSET = 0.085;
const PRONG_TIP_Y_INSET = 0.045;

const PRONG_TIP_Y =
  GROUND_Y - ELASTIC_RAISE + (PRONG_TIP_Y_INSET - SPRITE_ANCHOR_Y) * SPRITE_BASE_HEIGHT;
const PRONG_TIP_DX = SPRITE_BASE_WIDTH * (0.5 - PRONG_TIP_X_INSET);

const PRONG_LEFT = { x: SLINGSHOT_ANCHOR.x - PRONG_TIP_DX, y: PRONG_TIP_Y };
const PRONG_RIGHT = { x: SLINGSHOT_ANCHOR.x + PRONG_TIP_DX, y: PRONG_TIP_Y };
const ELASTIC_COLOR = 0x222222;

const buildFrame = (): Sprite => {
  const sprite = new Sprite(Texture.from(WEAPON_URL));
  sprite.anchor.set(0.5, SPRITE_ANCHOR_Y);
  sprite.width = SPRITE_WIDTH;
  sprite.height = SPRITE_HEIGHT;
  sprite.position.set(SLINGSHOT_ANCHOR.x, GROUND_Y - ELASTIC_RAISE - SLINGSHOT_EXTRA_RAISE);
  return sprite;
};

const drawElastic = (g: Graphics, carrot: Vec): void => {
  g.clear();
  g.moveTo(PRONG_LEFT.x, PRONG_LEFT.y)
    .lineTo(carrot.x, carrot.y)
    .stroke({ width: 3, color: ELASTIC_COLOR, cap: 'round' });
  g.moveTo(PRONG_RIGHT.x, PRONG_RIGHT.y)
    .lineTo(carrot.x, carrot.y)
    .stroke({ width: 3, color: ELASTIC_COLOR, cap: 'round' });
};

const clampMagnitude = (dx: number, dy: number, max: number): Vec => {
  const m = Math.hypot(dx, dy);
  if (m <= max) return { x: dx, y: dy };
  return { x: (dx / m) * max, y: (dy / m) * max };
};

interface State {
  view: Container;
  pos: Vec;
  elastic: Graphics;
}

const aimAt = (state: State, point: Vec): void => {
  const c = clampMagnitude(
    point.x - SLINGSHOT_ANCHOR.x,
    point.y - SLINGSHOT_ANCHOR.y,
    SLINGSHOT_MAX_PULL,
  );
  state.pos = { x: SLINGSHOT_ANCHOR.x + c.x, y: SLINGSHOT_ANCHOR.y + c.y };
};

const releaseVelocityOf = (state: State): Vec => ({
  x: (SLINGSHOT_ANCHOR.x - state.pos.x) * SLINGSHOT_POWER,
  y: (SLINGSHOT_ANCHOR.y - state.pos.y) * SLINGSHOT_POWER,
});

const buildApi = (state: State): Slingshot => ({
  view: state.view,
  anchor: () => SLINGSHOT_ANCHOR,
  carrotPosition: () => state.pos,
  aimAt: (point) => aimAt(state, point),
  releaseVelocity: () => releaseVelocityOf(state),
  reset: () => {
    state.pos = { ...SLINGSHOT_ANCHOR };
  },
  drawElasticTo: (carrot) => drawElastic(state.elastic, carrot),
  clearElastic: () => drawElastic(state.elastic, SLINGSHOT_ANCHOR),
});

export function createSlingshot(): Slingshot {
  const view = new Container();
  const frame = buildFrame();
  const elastic = new Graphics();
  drawElastic(elastic, SLINGSHOT_ANCHOR);
  view.addChild(frame, elastic);
  return buildApi({ view, pos: { ...SLINGSHOT_ANCHOR }, elastic });
}
