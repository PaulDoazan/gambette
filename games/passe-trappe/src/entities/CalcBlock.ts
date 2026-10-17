import { Container, Graphics, Text } from 'pixi.js';
import { opSymbol, type Pair } from '@gambette/math-sdk';
import { CALC_BLOCK, CALC_BLOCK_SIZE } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Player } from '../domain/types';

export interface CalcBlock {
  readonly view: Container;
  setPair(pair: Pair): void;
  text(): string;
}

export function createCalcBlock(player: Player): CalcBlock {
  const view = new Container();
  view.position.set(CALC_BLOCK[player].x, CALC_BLOCK[player].y);
  view.rotation = player === 'B' ? Math.PI : 0;
  const { w, h } = CALC_BLOCK_SIZE;
  view.addChild(
    new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 18)
      .fill(COLORS.calcFill)
      .stroke({ width: 3, color: COLORS.calcText }),
  );
  const label = new Text({
    text: '',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 40,
      fontWeight: '800',
      fill: COLORS.calcText,
    },
  });
  label.anchor.set(0.5);
  view.addChild(label);
  return {
    view,
    setPair: (pair) => {
      label.text = `${pair.a} ${opSymbol(pair.op)} ${pair.b} = ?`;
    },
    text: () => label.text,
  };
}
