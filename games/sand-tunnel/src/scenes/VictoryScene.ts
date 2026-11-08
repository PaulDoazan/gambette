import { Container, Graphics, Text } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/dimensions';
import { COLORS } from '../config/theme';

export interface VictoryScene {
  readonly view: Container;
  destroy(): void;
}

export const VICTORY_MESSAGE = 'Le poisson a rejoint la mer !';

const makeText = (text: string, size: number, color: number): Text => {
  const t = new Text({
    text,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '800', fill: color },
  });
  t.anchor.set(0.5);
  return t;
};

const makeButton = (label: string, name: string, x: number, y: number, onTap: () => void) => {
  const btn = new Container();
  btn.label = name;
  btn.position.set(x, y);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.addChild(
    new Graphics().roundRect(-120, -40, 240, 80, 40).fill(COLORS.button),
    makeText(label, 34, COLORS.buttonText),
  );
  btn.on('pointertap', onTap);
  return btn;
};

/** Victoire : le message, puis Rejouer / Quitter. */
export function createVictoryScene(deps: { onReplay(): void; onQuit(): void }): VictoryScene {
  const cy = DESIGN_HEIGHT / 2;
  const view = new Container();
  view.label = 'victory';
  view.eventMode = 'static';
  const title = makeText(VICTORY_MESSAGE, 46, COLORS.text);
  title.position.set(DESIGN_WIDTH / 2, cy - 140);
  const sub = makeText('Bravo, tu as trouvé tous les calculs !', 30, COLORS.button);
  sub.position.set(DESIGN_WIDTH / 2, cy - 70);
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
    title,
    sub,
    makeButton('↻ Rejouer', 'replay', DESIGN_WIDTH / 2 - 140, cy + 60, deps.onReplay),
    makeButton('✕ Quitter', 'quit', DESIGN_WIDTH / 2 + 140, cy + 60, deps.onQuit),
  );
  return { view, destroy: () => view.destroy({ children: true }) };
}
