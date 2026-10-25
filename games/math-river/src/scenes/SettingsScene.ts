import { Container, Graphics, Text } from 'pixi.js';
import type { Pair } from '@gambette/math-sdk';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Settings } from '../services/Settings';

export interface SettingsScene {
  readonly view: Container;
  destroy(): void;
}

const PANEL = { w: 600, h: 520 } as const;
const CX = DESIGN_WIDTH / 2;

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
  y: number,
  w: number,
  onTap: () => void,
  size = 32,
): Container => {
  const btn = new Container();
  btn.label = name;
  btn.position.set(CX, y);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.addChild(
    new Graphics().roundRect(-w / 2, -40, w, 80, 40).fill(COLORS.button),
    makeText(label, size, COLORS.buttonText),
  );
  btn.on('pointertap', onTap);
  return btn;
};

/** Interrupteur « Mêmes calculs pour les deux » : libellé à gauche, bouton glissant à droite. */
const makeSwitch = (
  y: number,
  on: boolean,
  onTap: () => void,
): { view: Container; set(on: boolean): void } => {
  const view = new Container();
  view.label = 'same';
  view.position.set(CX, y);
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const label = makeText('Mêmes calculs pour les deux', 28, COLORS.calcText);
  label.anchor.set(0, 0.5);
  label.x = -PANEL.w / 2 + 36;
  const track = new Graphics();
  const knob = new Graphics().circle(0, 0, 21).fill(0xffffff);
  const set = (v: boolean): void => {
    track
      .clear()
      .roundRect(-44, -27, 88, 54, 27)
      .fill(v ? COLORS.button : COLORS.switchOff);
    knob.position.set(PANEL.w / 2 - 80 + (v ? 18 : -18), 0);
  };
  track.x = PANEL.w / 2 - 80;
  // Zone de toucher sur toute la ligne, pas seulement sur le bouton.
  const hit = new Graphics()
    .rect(-PANEL.w / 2 + 20, -36, PANEL.w - 40, 72)
    .fill({ color: 0xffffff, alpha: 0.001 });
  view.addChild(hit, label, track, knob);
  view.on('pointertap', onTap);
  set(on);
  return { view, set };
};

/**
 * Réglages, comme passe-trappe (sans le nombre de palets) : le choix des calculs, les mêmes pour
 * les deux joueurs ou une sélection par joueur.
 */
export function createSettingsScene(deps: {
  initial: Settings;
  onOpenCalcsPicker(current: Pair[], title?: string): Promise<Pair[]>;
  onClose(next: Settings): void;
}): SettingsScene {
  // Centre vertical lu à la création : la hauteur du plateau dépend de l'écran.
  const CY = DESIGN_HEIGHT / 2;
  const calcs = { ...deps.initial.calcs };
  let destroyed = false;

  const pick = (pl: 'A' | 'B', title?: string): void => {
    void deps.onOpenCalcsPicker(calcs[pl], title).then(
      (next) => {
        // Le sélecteur peut se refermer après la destruction du panneau : on ignore alors.
        if (!destroyed) calcs[pl] = next;
      },
      () => {
        // Sélecteur annulé ou en échec : on garde la sélection courante.
      },
    );
  };

  const view = new Container();
  view.label = 'settings';
  view.eventMode = 'static';
  const title = makeText('Réglages', 48, COLORS.calcText);
  title.position.set(CX, CY - 190);
  const both = makeButton('Choisir les calculs', 'calcs', CY + 40, 460, () => pick('A'));
  const forA = makeButton(
    'Calculs du joueur du bas',
    'calcsA',
    CY - 5,
    500,
    () => pick('A', 'Calculs du joueur du bas'),
    28,
  );
  const forB = makeButton(
    'Calculs du joueur du haut',
    'calcsB',
    CY + 90,
    500,
    () => pick('B', 'Calculs du joueur du haut'),
    28,
  );
  const showCalcButtons = (): void => {
    both.visible = calcs.same;
    forA.visible = forB.visible = !calcs.same;
  };
  const toggle = makeSwitch(CY - 100, calcs.same, () => {
    calcs.same = !calcs.same;
    toggle.set(calcs.same);
    showCalcButtons();
  });
  showCalcButtons();
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
    new Graphics()
      .roundRect(CX - PANEL.w / 2, CY - PANEL.h / 2, PANEL.w, PANEL.h, 32)
      .fill(COLORS.calcFill),
    title,
    toggle.view,
    both,
    forA,
    forB,
    makeButton('Fermer', 'close', CY + 190, 240, () => deps.onClose({ calcs: { ...calcs } })),
  );

  return {
    view,
    destroy: () => {
      destroyed = true;
      view.destroy({ children: true });
    },
  };
}
