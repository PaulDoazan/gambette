import { Container, Graphics, Text } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH, MID_Y } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Player } from '../domain/types';

export interface VictoryScene {
  readonly view: Container;
  destroy(): void;
}

const MESSAGE: Record<Player, string> = {
  A: 'Joueur du bas gagne !',
  B: 'Joueur du haut gagne !',
};

const makeText = (text: string, size: number, color: number): Text => {
  const t = new Text({
    text,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '800', fill: color },
  });
  t.anchor.set(0.5);
  return t;
};

const makeButton = (label: string, name: string, x: number, onTap: () => void): Container => {
  const btn = new Container();
  btn.label = name;
  btn.position.set(x, MID_Y);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  const bg = new Graphics().roundRect(-120, -40, 240, 80, 40).fill(COLORS.button);
  btn.addChild(bg, makeText(label, 34, COLORS.buttonText));
  btn.on('pointertap', onTap);
  return btn;
};

export function createVictoryScene(deps: {
  winner: Player;
  onReplay(): void;
  onQuit(): void;
}): VictoryScene {
  const view = new Container();
  view.eventMode = 'static';
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
  );
  const bottom = makeText(MESSAGE[deps.winner], 52, COLORS.text);
  bottom.position.set(DESIGN_WIDTH / 2, MID_Y + 200);
  const top = makeText(MESSAGE[deps.winner], 52, COLORS.text);
  top.position.set(DESIGN_WIDTH / 2, MID_Y - 200);
  top.rotation = Math.PI;
  view.addChild(
    bottom,
    top,
    makeButton('↻ Rejouer', 'replay', DESIGN_WIDTH / 2 - 140, deps.onReplay),
    makeButton('✕ Quitter', 'quit', DESIGN_WIDTH / 2 + 140, deps.onQuit),
  );
  return { view, destroy: () => view.destroy({ children: true }) };
}
