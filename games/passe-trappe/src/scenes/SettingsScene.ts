import { Container, Graphics, Text } from 'pixi.js';
import type { Pair } from '@gambette/math-sdk';
import { DESIGN_HEIGHT, DESIGN_WIDTH, MAX_PUCKS, MIN_PUCKS } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Settings } from '../services/Settings';

export interface SettingsScene {
  readonly view: Container;
  pucksPerPlayer(): number;
  destroy(): void;
}

const PANEL = { w: 560, h: 460 } as const;
const CX = DESIGN_WIDTH / 2;
const CY = DESIGN_HEIGHT / 2;

const makeText = (text: string, size: number, color: number): Text => {
  const t = new Text({
    text,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '800', fill: color },
  });
  t.anchor.set(0.5);
  return t;
};

const makeButton = (
  label: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  onTap: () => void,
): Container => {
  const btn = new Container();
  btn.label = name;
  btn.position.set(x, y);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.addChild(
    new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2).fill(COLORS.button),
    makeText(label, 32, COLORS.buttonText),
  );
  btn.on('pointertap', onTap);
  return btn;
};

export function createSettingsScene(deps: {
  initial: Settings;
  onOpenCalcsPicker(current: Pair[]): Promise<Pair[]>;
  onClose(next: Settings): void;
}): SettingsScene {
  let pucks = deps.initial.pucksPerPlayer;
  let pairs: Pair[] = [...deps.initial.selectedPairs];
  let destroyed = false;

  const view = new Container();
  view.label = 'settings';
  view.eventMode = 'static';
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
    new Graphics()
      .roundRect(CX - PANEL.w / 2, CY - PANEL.h / 2, PANEL.w, PANEL.h, 32)
      .fill(COLORS.calcFill),
  );

  const title = makeText('Réglages', 48, COLORS.calcText);
  title.position.set(CX, CY - 160);
  const caption = makeText('Palets par joueur', 30, COLORS.calcText);
  caption.position.set(CX, CY - 80);
  const value = makeText(String(pucks), 52, COLORS.calcText);
  value.position.set(CX, CY - 10);
  const setPucks = (n: number): void => {
    pucks = Math.max(MIN_PUCKS, Math.min(MAX_PUCKS, n));
    value.text = String(pucks);
  };

  view.addChild(
    title,
    caption,
    value,
    makeButton('−', 'minus', CX - 130, CY - 10, 90, 80, () => setPucks(pucks - 1)),
    makeButton('+', 'plus', CX + 130, CY - 10, 90, 80, () => setPucks(pucks + 1)),
    makeButton('Choisir les calculs', 'calcs', CX, CY + 80, 440, 80, () => {
      void deps.onOpenCalcsPicker(pairs).then(
        (next) => {
          // Le sélecteur peut se refermer après la destruction du panneau : on ignore alors.
          if (!destroyed) pairs = next;
        },
        () => {
          // Sélecteur annulé ou en échec : on garde la sélection courante.
        },
      );
    }),
    makeButton('Fermer', 'close', CX, CY + 170, 240, 80, () =>
      deps.onClose({ pucksPerPlayer: pucks, selectedPairs: pairs }),
    ),
  );

  return {
    view,
    pucksPerPlayer: () => pucks,
    destroy: () => {
      destroyed = true;
      view.destroy({ children: true });
    },
  };
}
