import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { COLORS, STROKE } from '../config/theme';
import { tweenObject } from './animations/Tween';
import {
  animateChew,
  animateHopInPlace,
  animateJumpFromTree,
  animateRunAwayRight,
  animateShakeNo,
} from './animations/RabbitAnims';

export interface Aabb {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export interface Vec {
  x: number;
  y: number;
}

export const MOUTH_TWEEN_MS = 90;

export interface Rabbit {
  readonly view: Container;
  setNumber(n: number): void;
  getNumber(): number;
  isFallen(): boolean;
  markFallen(): void;
  getCollisionAabb(): Aabb;
  position: Vec;
  setAimed(aimed: boolean): void;
  playShakeNo(): Promise<void>;
  playChew(times: number): Promise<void>;
  playJumpFromTree(landingY: number): Promise<void>;
  playHopInPlace(): Promise<void>;
  playRunAwayRight(offscreenX: number): Promise<void>;
}

const drawEars = (g: Graphics): void => {
  // Two long ears with their base touching the top of the head.
  g.ellipse(-10, -28, 5, 16)
    .fill(COLORS.rabbitBody)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
  g.ellipse(10, -28, 5, 16)
    .fill(COLORS.rabbitBody)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
  g.ellipse(-10, -28, 2, 11).fill(COLORS.rabbitInnerEar);
  g.ellipse(10, -28, 2, 11).fill(COLORS.rabbitInnerEar);
};

const drawBody = (g: Graphics): void => {
  g.ellipse(0, 0, 22, 20)
    .fill(COLORS.rabbitBody)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
};

const drawEyes = (g: Graphics): void => {
  g.circle(-7, -6, 2).fill(COLORS.outline);
  g.circle(7, -6, 2).fill(COLORS.outline);
};

const drawMouth = (g: Graphics): void => {
  // Inverted Y (180°): two top branches converge at junction, stem extends down.
  g.moveTo(-3, -1)
    .lineTo(0, 2)
    .moveTo(3, -1)
    .lineTo(0, 2)
    .moveTo(0, 2)
    .lineTo(0, 5)
    .stroke({ width: STROKE.thin, color: COLORS.outline, cap: 'round' });
};

const buildOpenMouth = (): Graphics => {
  const g = new Graphics();
  g.ellipse(0, 0, 7, 5).fill(COLORS.outline);
  const toothW = 8;
  const toothH = 7;
  const toothTop = -4;
  const toothHalfW = toothW / 2;
  const toothArcCy = toothTop + toothH - toothHalfW;
  g.moveTo(-toothHalfW, toothTop)
    .lineTo(toothHalfW, toothTop)
    .lineTo(toothHalfW, toothArcCy)
    .arc(0, toothArcCy, toothHalfW, 0, Math.PI)
    .lineTo(-toothHalfW, toothTop)
    .fill(COLORS.cloud)
    .stroke({ width: STROKE.thin, color: COLORS.outline });
  g.pivot.set(0, -5);
  g.position.set(0, -1);
  g.scale.set(1, 0);
  return g;
};

const drawSign = (g: Graphics): void => {
  g.roundRect(-20, 8, 40, 24, 4)
    .fill(COLORS.signFill)
    .stroke({ width: STROKE.normal, color: COLORS.outline });
};

const drawPaws = (g: Graphics): void => {
  // Two paws above the sign (top edge ~y=8) and two below (bottom edge ~y=32).
  g.ellipse(-14, 6, 4, 3)
    .fill(COLORS.rabbitBody)
    .stroke({ width: STROKE.thin, color: COLORS.outline });
  g.ellipse(14, 6, 4, 3)
    .fill(COLORS.rabbitBody)
    .stroke({ width: STROKE.thin, color: COLORS.outline });
  g.ellipse(-14, 34, 4, 3)
    .fill(COLORS.rabbitBody)
    .stroke({ width: STROKE.thin, color: COLORS.outline });
  g.ellipse(14, 34, 4, 3)
    .fill(COLORS.rabbitBody)
    .stroke({ width: STROKE.thin, color: COLORS.outline });
};

const TEXT_STYLE = new TextStyle({
  fontFamily: 'ui-rounded, system-ui',
  fontWeight: '800',
  fontSize: 14,
  fill: COLORS.outline,
  align: 'center',
});

interface State {
  number: number;
  fallen: boolean;
  aimed: boolean;
  position: Vec;
  view: Container;
  text: Text;
  openMouth: Graphics;
}

const buildView = (pos: Vec): { view: Container; text: Text; openMouth: Graphics } => {
  const view = new Container();
  view.position.set(pos.x, pos.y);
  const g = new Graphics();
  drawEars(g);
  drawBody(g);
  drawEyes(g);
  drawMouth(g);
  drawSign(g);
  drawPaws(g);
  view.addChild(g);
  const openMouth = buildOpenMouth();
  view.addChild(openMouth);
  const text = new Text({ text: '', style: TEXT_STYLE });
  text.anchor.set(0.5);
  text.position.set(0, 20);
  view.addChild(text);
  return { view, text, openMouth };
};

const aabbAt = (pos: Vec): Aabb => ({
  minX: pos.x - 30,
  maxX: pos.x + 30,
  minY: pos.y - 60,
  maxY: pos.y + 30,
});

const setAimed = (state: State, aimed: boolean): void => {
  if (state.aimed === aimed || state.fallen) return;
  state.aimed = aimed;
  void tweenObject(state.openMouth.scale, { y: aimed ? 1 : 0 }, MOUTH_TWEEN_MS);
};

const setNumber = (state: State, n: number): void => {
  state.number = n;
  state.text.text = String(n);
};

const playJump = (state: State, y: number): Promise<void> => {
  state.fallen = true;
  return animateJumpFromTree(state, y);
};

const buildApi = (state: State): Rabbit => ({
  view: state.view,
  position: state.position,
  setNumber: (n) => setNumber(state, n),
  getNumber: () => state.number,
  isFallen: () => state.fallen,
  markFallen: () => {
    state.fallen = true;
  },
  getCollisionAabb: () => aabbAt(state.position),
  setAimed: (aimed) => setAimed(state, aimed),
  playShakeNo: () => animateShakeNo(state.view, state.position.x),
  playChew: (times) => animateChew(state, times),
  playJumpFromTree: (y) => playJump(state, y),
  playHopInPlace: () => animateHopInPlace(state),
  playRunAwayRight: (x) => animateRunAwayRight(state, x),
});

export function createRabbit(opts: { position: Vec }): Rabbit {
  const { view, text, openMouth } = buildView(opts.position);
  const state: State = {
    number: 0,
    fallen: false,
    aimed: false,
    position: { ...opts.position },
    view,
    text,
    openMouth,
  };
  return buildApi(state);
}
