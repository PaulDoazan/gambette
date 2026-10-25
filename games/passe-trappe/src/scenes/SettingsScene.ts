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

const PANEL = { w: 600, h: 620 } as const;
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
  x: number,
  y: number,
  w: number,
  h: number,
  onTap: () => void,
  size = 32,
): Container => {
  const btn = new Container();
  btn.label = name;
  btn.position.set(x, y);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.addChild(
    new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2).fill(COLORS.button),
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
  track.x = PANEL.w / 2 - 80;
  const knob = new Graphics().circle(0, 0, 21).fill(0xffffff);
  const set = (v: boolean): void => {
    track
      .clear()
      .roundRect(-44, -27, 88, 54, 27)
      .fill(v ? COLORS.button : COLORS.switchOff);
    knob.position.set(track.x + (v ? 18 : -18), 0);
  };
  // Zone de toucher sur toute la ligne, pas seulement sur le bouton.
  const hit = new Graphics()
    .rect(-PANEL.w / 2 + 20, -36, PANEL.w - 40, 72)
    .fill({ color: 0xffffff, alpha: 0.001 });
  view.addChild(hit, label, track, knob);
  view.on('pointertap', onTap);
  set(on);
  return { view, set };
};

/** Réglages : palets par joueur, et calculs, les mêmes pour les deux ou une sélection par joueur. */
export function createSettingsScene(deps: {
  initial: Settings;
  onOpenCalcsPicker(current: Pair[], title?: string): Promise<Pair[]>;
  onClose(next: Settings): void;
}): SettingsScene {
  // Centre vertical lu à la création : la hauteur du plateau dépend de l'écran.
  const CY = DESIGN_HEIGHT / 2;
  let pucks = deps.initial.pucksPerPlayer;
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
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
    new Graphics()
      .roundRect(CX - PANEL.w / 2, CY - PANEL.h / 2, PANEL.w, PANEL.h, 32)
      .fill(COLORS.calcFill),
  );

  const title = makeText('Réglages', 48, COLORS.calcText);
  title.position.set(CX, CY - 250);
  const caption = makeText('Palets par joueur', 30, COLORS.calcText);
  caption.position.set(CX, CY - 175);
  const value = makeText(String(pucks), 52, COLORS.calcText);
  value.position.set(CX, CY - 110);
  const setPucks = (n: number): void => {
    pucks = Math.max(MIN_PUCKS, Math.min(MAX_PUCKS, n));
    value.text = String(pucks);
  };

  const both = makeButton('Choisir les calculs', 'calcs', CX, CY + 100, 460, 80, () => pick('A'));
  const forA = makeButton(
    'Calculs du joueur du bas',
    'calcsA',
    CX,
    CY + 55,
    500,
    80,
    () => pick('A', 'Calculs du joueur du bas'),
    28,
  );
  const forB = makeButton(
    'Calculs du joueur du haut',
    'calcsB',
    CX,
    CY + 145,
    500,
    80,
    () => pick('B', 'Calculs du joueur du haut'),
    28,
  );
  const showCalcButtons = (): void => {
    both.visible = calcs.same;
    forA.visible = forB.visible = !calcs.same;
  };
  const toggle = makeSwitch(CY - 25, calcs.same, () => {
    calcs.same = !calcs.same;
    toggle.set(calcs.same);
    showCalcButtons();
  });
  showCalcButtons();

  view.addChild(
    title,
    caption,
    value,
    makeButton('−', 'minus', CX - 130, CY - 110, 90, 80, () => setPucks(pucks - 1)),
    makeButton('+', 'plus', CX + 130, CY - 110, 90, 80, () => setPucks(pucks + 1)),
    toggle.view,
    both,
    forA,
    forB,
    makeButton('Fermer', 'close', CX, CY + 245, 240, 80, () =>
      deps.onClose({ pucksPerPlayer: pucks, calcs: { ...calcs } }),
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
