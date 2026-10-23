import { Container, Graphics, Text } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH, MID_Y } from '../config/dimensions';
import { COLORS } from '../config/theme';

export interface VictoryScene {
  readonly view: Container;
  destroy(): void;
}

export const VICTORY_MESSAGE = 'Le poisson est sauvé !';

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

/** Victoire commune : le message à l'endroit pour A, tourné pour B ; Rejouer / Quitter au milieu. */
export function createVictoryScene(deps: { onReplay(): void; onQuit(): void }): VictoryScene {
  const view = new Container();
  view.label = 'victory';
  view.eventMode = 'static';
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
  );
  for (const side of [1, -1]) {
    const title = makeText(VICTORY_MESSAGE, 52, COLORS.text);
    title.position.set(DESIGN_WIDTH / 2, MID_Y + side * 160);
    const sub = makeText('Bravo l’équipe !', 32, COLORS.button);
    sub.position.set(DESIGN_WIDTH / 2, MID_Y + side * 230);
    if (side < 0) {
      title.rotation = Math.PI;
      sub.rotation = Math.PI;
    }
    view.addChild(title, sub);
  }
  view.addChild(
    makeButton('↻ Rejouer', 'replay', DESIGN_WIDTH / 2 - 140, deps.onReplay),
    makeButton('✕ Quitter', 'quit', DESIGN_WIDTH / 2 + 140, deps.onQuit),
  );
  return { view, destroy: () => view.destroy({ children: true }) };
}
