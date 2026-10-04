import { ASSET_URLS } from '../assets';
import type { PhysicsWorld, PxBody, Vec } from '../core/PhysicsWorld';
import { Container, Sprite, Texture } from 'pixi.js';
import {
  CARROT_DENSITY,
  CARROT_FRICTION,
  CARROT_RADIUS,
  CARROT_RESTITUTION,
} from '../config/physics';

const CARROT_URL = ASSET_URLS.carrot;
const CARROT_VIEW_WIDTH = 24 * 0.75;
const CARROT_VIEW_HEIGHT = (CARROT_VIEW_WIDTH * 631) / 248;

export type { Vec };

export interface Carrot {
  readonly view: Container;
  readonly body: PxBody;
  isLaunched(): boolean;
  launch(velocity: Vec): void;
  restAtGround(at: Vec): void;
  syncView(): void;
}

interface State {
  view: Container;
  body: PxBody;
  launched: boolean;
}

const createCarrotSprite = (): Sprite => {
  const sprite = new Sprite(Texture.from(CARROT_URL));
  sprite.anchor.set(0.5);
  sprite.width = CARROT_VIEW_WIDTH;
  sprite.height = CARROT_VIEW_HEIGHT;
  return sprite;
};

const buildApi = (state: State): Carrot => ({
  view: state.view,
  body: state.body,
  isLaunched: () => state.launched,
  launch: (v) => {
    state.launched = true;
    state.body.setStatic(false);
    state.body.setVelocity(v);
    state.body.setAngularVelocity(0.35);
  },
  restAtGround: (pos) => {
    state.body.setVelocity({ x: 0, y: 0 });
    state.body.setPosition(pos);
    state.body.setStatic(true);
  },
  syncView: () => {
    const p = state.body.position();
    state.view.position.set(p.x, p.y);
    state.view.rotation = state.body.angle();
  },
});

export function createCarrot(at: Vec, physics: PhysicsWorld): Carrot {
  const view = new Container();
  view.addChild(createCarrotSprite());
  view.position.set(at.x, at.y);
  const body = physics.createCircle(at, CARROT_RADIUS, {
    density: CARROT_DENSITY,
    friction: CARROT_FRICTION,
    restitution: CARROT_RESTITUTION,
  });
  return buildApi({ view, body, launched: false });
}
