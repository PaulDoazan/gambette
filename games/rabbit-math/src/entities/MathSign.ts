import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MATH_SIGN } from '../config/dimensions';
import { COLORS, STROKE } from '../config/theme';
import type { Question } from '@gambette/math-sdk';
import { opSymbol } from '@gambette/math-sdk';
import { tweenObject } from './animations/Tween';

export interface MathSign {
  readonly view: Container;
  setQuestion(q: Question): void;
  setEndOfSessionMessage(score: number, total: number): void;
  setWidth(w: number): void;
  tweenWidthTo(w: number, ms?: number): Promise<void>;
  currentWidth(): number;
  text(): string;
}

const TEXT_STYLE = new TextStyle({
  fontFamily: 'ui-rounded, system-ui',
  fontWeight: '800',
  fontSize: 26,
  fill: COLORS.outline,
  align: 'center',
});

const redrawBox = (g: Graphics, width: number) => {
  g.clear();
  g.roundRect(-width / 2, -MATH_SIGN.height / 2, width, MATH_SIGN.height, 6)
    .fill(COLORS.signFill)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
};

interface State {
  view: Container;
  g: Graphics;
  t: Text;
  width: number;
  tracker: { width: number };
}

const applyWidth = (state: State, w: number) => {
  state.width = w;
  state.tracker.width = w;
  redrawBox(state.g, w);
};

const buildApi = (state: State): MathSign => ({
  view: state.view,
  setQuestion: (q) => {
    state.t.text = `${q.a} ${opSymbol(q.op)} ${q.b} = ?`;
  },
  setEndOfSessionMessage: (score, total) => {
    state.t.text = `${score} / ${total} bonnes réponses`;
  },
  setWidth: (w) => applyWidth(state, w),
  tweenWidthTo: async (w, ms = 250) => {
    await tweenObject(state.tracker, { width: w }, ms);
    applyWidth(state, state.tracker.width);
  },
  currentWidth: () => state.width,
  text: () => state.t.text,
});

const buildView = (): { view: Container; g: Graphics; t: Text } => {
  const view = new Container();
  view.position.set(MATH_SIGN.x, MATH_SIGN.y);
  const g = new Graphics();
  view.addChild(g);
  redrawBox(g, MATH_SIGN.defaultWidth);
  const t = new Text({ text: '', style: TEXT_STYLE });
  t.anchor.set(0.5);
  view.addChild(t);
  return { view, g, t };
};

export function createMathSign(): MathSign {
  const { view, g, t } = buildView();
  const width = MATH_SIGN.defaultWidth;
  return buildApi({ view, g, t, width, tracker: { width } });
}
