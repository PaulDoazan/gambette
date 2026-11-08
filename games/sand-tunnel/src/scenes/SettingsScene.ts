import { Container, Graphics, Text } from 'pixi.js';
import type { Pair } from '@gambette/math-sdk';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Settings } from '../services/Settings';

export interface SettingsScene {
  readonly view: Container;
  destroy(): void;
}

const PANEL = { w: 600, h: 420 } as const;
const CX = DESIGN_WIDTH / 2;

const makeText = (text: string, size: number, color: number): Text => {
  const t = new Text({
    text,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '800', fill: color },
  });
  t.anchor.set(0.5);
  return t;
};

const makeButton = (label: string, name: string, y: number, w: number, onTap: () => void) => {
  const btn = new Container();
  btn.label = name;
  btn.position.set(CX, y);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.addChild(
    new Graphics().roundRect(-w / 2, -40, w, 80, 40).fill(COLORS.button),
    makeText(label, 32, COLORS.buttonText),
  );
  btn.on('pointertap', onTap);
  return btn;
};

/** Réglages : le choix des calculs dont on cherche le résultat. */
export function createSettingsScene(deps: {
  initial: Settings;
  onOpenCalcsPicker(current: Pair[]): Promise<Pair[]>;
  onClose(next: Settings): void;
}): SettingsScene {
  // Centre vertical lu à la création : la hauteur du plateau dépend de l'écran.
  const CY = DESIGN_HEIGHT / 2;
  let calcs = deps.initial.calcs;
  let destroyed = false;

  const view = new Container();
  view.label = 'settings';
  view.eventMode = 'static';
  const title = makeText('Réglages', 48, COLORS.calcText);
  title.position.set(CX, CY - 130);
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
    new Graphics()
      .roundRect(CX - PANEL.w / 2, CY - PANEL.h / 2, PANEL.w, PANEL.h, 32)
      .fill(COLORS.calcFill),
    title,
    makeButton('Choisir les calculs', 'calcs', CY - 10, 460, () => {
      void deps.onOpenCalcsPicker(calcs).then(
        (next) => {
          // Le sélecteur peut se refermer après la destruction du panneau : on ignore alors.
          if (!destroyed) calcs = next;
        },
        () => {
          // Sélecteur annulé ou en échec : on garde la sélection courante.
        },
      );
    }),
    makeButton('Fermer', 'close', CY + 120, 240, () => deps.onClose({ calcs })),
  );

  return {
    view,
    destroy: () => {
      destroyed = true;
      view.destroy({ children: true });
    },
  };
}
