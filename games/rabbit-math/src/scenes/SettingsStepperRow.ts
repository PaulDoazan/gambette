import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { COLORS, STROKE } from '../config/theme';
import { PANEL_X, PANEL_WIDTH, PANEL_Y, ROW_HEIGHT } from './SettingsPanel';

const STEPPER_BTN_R = 11;
const BTN_GAP = 64;

const LABEL_STYLE = new TextStyle({
  fontFamily: 'ui-rounded, system-ui',
  fontWeight: '700',
  fontSize: 16,
  fill: COLORS.outline,
});
const VALUE_STYLE = new TextStyle({
  fontFamily: 'ui-rounded, system-ui',
  fontWeight: '800',
  fontSize: 16,
  fill: COLORS.outline,
});
const BTN_TEXT_STYLE = new TextStyle({
  fontFamily: 'ui-rounded, system-ui',
  fontWeight: '800',
  fontSize: 18,
  fill: COLORS.outline,
});

export interface StepperRow {
  readonly view: Container;
  setValue(label: string): void;
  setEnabled(opts: { minus: boolean; plus: boolean }): void;
  onMinus(handler: () => void): void;
  onPlus(handler: () => void): void;
}

interface StepperButton {
  view: Container;
  setEnabled(b: boolean): void;
}

const drawCircleBg = (cx: number, cy: number): Graphics => {
  const bg = new Graphics();
  bg.circle(cx, cy, STEPPER_BTN_R)
    .fill(COLORS.sky)
    .stroke({ width: STROKE.normal, color: COLORS.outline });
  return bg;
};

const setButtonEnabled = (view: Container, enabled: boolean): void => {
  view.alpha = enabled ? 1 : 0.35;
  view.cursor = enabled ? 'pointer' : 'default';
  view.eventMode = enabled ? 'static' : 'none';
};

const createStepperButton = (symbol: string, cx: number, cy: number): StepperButton => {
  const view = new Container();
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const t = new Text({ text: symbol, style: BTN_TEXT_STYLE });
  t.anchor.set(0.5);
  t.position.set(cx, cy - 1);
  view.addChild(drawCircleBg(cx, cy), t);
  return { view, setEnabled: (b) => setButtonEnabled(view, b) };
};

interface RowLayout {
  cy: number;
  minusCx: number;
  plusCx: number;
  valueCx: number;
}

const computeLayout = (rowIndex: number): { y: number; lo: RowLayout } => {
  const y = PANEL_Y + 50 + rowIndex * ROW_HEIGHT;
  const cy = y + 9;
  const plusCx = PANEL_X + PANEL_WIDTH - 24 - STEPPER_BTN_R;
  const minusCx = plusCx - BTN_GAP;
  return { y, lo: { cy, minusCx, plusCx, valueCx: (plusCx + minusCx) / 2 } };
};

const buildRowParts = (
  label: string,
  y: number,
  lo: RowLayout,
): {
  l: Text;
  v: Text;
  minusBtn: StepperButton;
  plusBtn: StepperButton;
} => {
  const l = new Text({ text: label, style: LABEL_STYLE });
  l.position.set(PANEL_X + 24, y);
  const v = new Text({ text: '', style: VALUE_STYLE });
  v.anchor.set(0.5);
  v.position.set(lo.valueCx, lo.cy);
  const minusBtn = createStepperButton('−', lo.minusCx, lo.cy);
  const plusBtn = createStepperButton('+', lo.plusCx, lo.cy);
  return { l, v, minusBtn, plusBtn };
};

export function createStepperRow(label: string, rowIndex: number): StepperRow {
  const view = new Container();
  const { y, lo } = computeLayout(rowIndex);
  const { l, v, minusBtn, plusBtn } = buildRowParts(label, y, lo);
  view.addChild(l, v, minusBtn.view, plusBtn.view);
  let onMinus: (() => void) | null = null;
  let onPlus: (() => void) | null = null;
  minusBtn.view.on('pointerup', () => onMinus?.());
  plusBtn.view.on('pointerup', () => onPlus?.());
  return {
    view,
    setValue: (s) => {
      v.text = s;
    },
    setEnabled: ({ minus, plus }) => {
      minusBtn.setEnabled(minus);
      plusBtn.setEnabled(plus);
    },
    onMinus: (h) => {
      onMinus = h;
    },
    onPlus: (h) => {
      onPlus = h;
    },
  };
}
