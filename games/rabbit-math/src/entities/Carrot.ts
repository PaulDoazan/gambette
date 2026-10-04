import Matter from 'matter-js';
import { ASSET_URLS } from '../assets';
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

export interface Vec {
  x: number;
  y: number;
}

export interface Carrot {
  readonly view: Container;
  readonly body: Matter.Body;
  isLaunched(): boolean;
  launch(velocity: Vec): void;
  restAtGround(at: Vec): void;
  syncView(): void;
}

interface State {
  view: Container;
  body: Matter.Body;
  launched: boolean;
}

const createCarrotSprite = (): Sprite => {
  const sprite = new Sprite(Texture.from(CARROT_URL));
  sprite.anchor.set(0.5);
  sprite.width = CARROT_VIEW_WIDTH;
  sprite.height = CARROT_VIEW_HEIGHT;
  return sprite;
};

const makeBody = (at: Vec): Matter.Body => {
  // Create dynamic so mass is computed from density, then freeze.
  // Matter.js stores original mass for later setStatic(false) restore.
  const body = Matter.Bodies.circle(at.x, at.y, CARROT_RADIUS, {
    density: CARROT_DENSITY,
    friction: CARROT_FRICTION,
    restitution: CARROT_RESTITUTION,
    label: 'carrot',
  });
  Matter.Body.setStatic(body, true);
  return body;
};

const buildApi = (state: State): Carrot => ({
  view: state.view,
  body: state.body,
  isLaunched: () => state.launched,
  launch: (v) => {
    state.launched = true;
    Matter.Body.setStatic(state.body, false);
    Matter.Body.setVelocity(state.body, v);
    Matter.Body.setAngularVelocity(state.body, 0.35);
  },
  restAtGround: (pos) => {
    Matter.Body.setVelocity(state.body, { x: 0, y: 0 });
    Matter.Body.setPosition(state.body, pos);
    Matter.Body.setStatic(state.body, true);
  },
  syncView: () => {
    state.view.position.set(state.body.position.x, state.body.position.y);
    state.view.rotation = state.body.angle;
  },
});

export function createCarrot(at: Vec): Carrot {
  const view = new Container();
  view.addChild(createCarrotSprite());
  view.position.set(at.x, at.y);
  return buildApi({ view, body: makeBody(at), launched: false });
}
