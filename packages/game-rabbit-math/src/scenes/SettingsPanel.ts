import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { COLORS, STROKE } from '../config/theme';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/dimensions';
import type { Pair } from '@gambette/math-sdk';
import type { Settings, RabbitsCount } from '../services/Settings';

export const RABBITS_OPTIONS: ReadonlyArray<RabbitsCount> = [4, 5, 6, 7, 8];

export const cycle = <T>(arr: readonly T[], current: T): T => {
  const idx = arr.indexOf(current);
  return arr[(idx + 1) % arr.length] as T;
};

export const arrayEqualPairs = (a: readonly Pair[], b: readonly Pair[]): boolean => {
  if (a.length !== b.length) return false;
  const key = (p: Pair): string => `${p.a}x${p.b}`;
  const setA = new Set(a.map(key));
  return b.every((p) => setA.has(key(p)));
};

export const sessionImpactingChanged = (a: Settings, b: Settings): boolean =>
  !arrayEqualPairs(a.selectedPairs, b.selectedPairs) ||
  a.rabbitsCount !== b.rabbitsCount ||
  a.tapMode !== b.tapMode;

export const onOff = (b: boolean): string => (b ? 'ON' : 'OFF');

const PANEL_W = 540;
const PANEL_H = 220;
const BACK_ALPHA = 0.6;

const TITLE_STYLE = new TextStyle({
  fontFamily: 'ui-rounded, system-ui',
  fontWeight: '800',
  fontSize: 22,
  fill: COLORS.outline,
});
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

export const PANEL_X = (DESIGN_WIDTH - PANEL_W) / 2;
export const PANEL_Y = (DESIGN_HEIGHT - PANEL_H) / 2;
export const ROW_HEIGHT = 28;
export const PANEL_WIDTH = PANEL_W;
export const PANEL_HEIGHT = PANEL_H;

export function createPanelBackground(): Container {
  const root = new Container();
  const dim = new Graphics();
  dim.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x000000, alpha: BACK_ALPHA });
  const card = new Graphics();
  card
    .roundRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12)
    .fill(COLORS.signFill)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
  root.addChild(dim, card);
  return root;
}

export function createPanelTitle(text: string): Text {
  const t = new Text({ text, style: TITLE_STYLE });
  t.anchor.set(0.5, 0);
  t.position.set(DESIGN_WIDTH / 2, PANEL_Y + 14);
  return t;
}

export interface CycleRow {
  readonly view: Container;
  setValue(label: string): void;
  onTap(handler: () => void): void;
}

const buildRowTexts = (label: string, y: number): { l: Text; v: Text } => {
  const l = new Text({ text: label, style: LABEL_STYLE });
  l.position.set(PANEL_X + 24, y);
  const v = new Text({ text: '', style: VALUE_STYLE });
  v.anchor.set(1, 0);
  v.position.set(PANEL_X + PANEL_W - 24, y);
  return { l, v };
};

const measureText = (t: Text): { w: number; h: number } | null => {
  try {
    return { w: t.width, h: t.height };
  } catch {
    return null;
  }
};

const drawLabelUnderline = (g: Graphics, l: Text): void => {
  const m = measureText(l);
  if (!m) return;
  g.clear();
  const lineY = l.y + m.h + 1;
  g.moveTo(l.x, lineY)
    .lineTo(l.x + m.w, lineY)
    .stroke({ width: STROKE.thin, color: COLORS.outline });
};

interface CycleRowParts {
  view: Container;
  l: Text;
  v: Text;
  underline: Graphics | null;
}

const initCycleRowParts = (
  label: string,
  rowIndex: number,
  useUnderline: boolean,
): CycleRowParts => {
  const view = new Container();
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const y = PANEL_Y + 50 + rowIndex * ROW_HEIGHT;
  const { l, v } = buildRowTexts(label, y);
  const underline = useUnderline ? new Graphics() : null;
  view.addChild(l, v);
  if (underline) view.addChild(underline);
  return { view, l, v, underline };
};

export function createCycleRow(
  label: string,
  rowIndex: number,
  opts: { underline?: boolean } = {},
): CycleRow {
  const { view, l, v, underline } = initCycleRowParts(label, rowIndex, !!opts.underline);
  let handler: (() => void) | null = null;
  view.on('pointerup', () => handler?.());
  return {
    view,
    setValue: (s) => {
      v.text = s;
      if (underline) drawLabelUnderline(underline, l);
    },
    onTap: (h) => {
      handler = h;
    },
  };
}

const drawButtonBg = (x: number, y: number, w: number, h: number): Graphics => {
  const bg = new Graphics();
  bg.roundRect(x, y, w, h, 6)
    .fill(COLORS.sky)
    .stroke({ width: STROKE.normal, color: COLORS.outline });
  return bg;
};

const buttonY = (): number => PANEL_Y + PANEL_H - 40;

export function createCloseButton(label: string, onTap: () => void): Container {
  const view = new Container();
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const y = buttonY();
  const bg = drawButtonBg(DESIGN_WIDTH / 2 - 60, y, 120, 30);
  const t = new Text({ text: label, style: VALUE_STYLE });
  t.anchor.set(0.5);
  t.position.set(DESIGN_WIDTH / 2, y + 15);
  view.addChild(bg, t);
  view.on('pointerup', onTap);
  return view;
}

export function createConfirmButton(label: string, cx: number, onTap: () => void): Container {
  const view = new Container();
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const y = buttonY();
  const bg = drawButtonBg(cx - 50, y, 100, 30);
  const t = new Text({ text: label, style: VALUE_STYLE });
  t.anchor.set(0.5);
  t.position.set(cx, y + 15);
  view.addChild(bg, t);
  view.on('pointerup', onTap);
  return view;
}

export function createConfirmPrompt(
  question: string,
  onYes: () => void,
  onNo: () => void,
): Container {
  const view = new Container();
  const y = buttonY();
  const q = new Text({ text: question, style: LABEL_STYLE });
  q.anchor.set(0.5);
  q.position.set(DESIGN_WIDTH / 2, y - 14);
  const yes = createConfirmButton('Oui', DESIGN_WIDTH / 2 - 70, onYes);
  const no = createConfirmButton('Non', DESIGN_WIDTH / 2 + 70, onNo);
  view.addChild(q, yes, no);
  return view;
}
