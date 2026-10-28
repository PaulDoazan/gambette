import { Container, Graphics, Text } from 'pixi.js';
import type { Pair } from '@gambette/math-sdk';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Scene } from '../core/Scene';
import type { RabbitsCount, Settings } from '../services/Settings';

export interface SettingsScene extends Scene {
  rabbitsCount(): RabbitsCount;
}

const RABBITS_MIN = 4;
const RABBITS_MAX = 8;

const PANEL = { w: 460, h: 360 } as const;
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
  size = 20,
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

/** Interrupteur : libellé à gauche, bouton glissant à droite, toute la ligne se touche. */
const makeSwitch = (
  name: string,
  text: string,
  y: number,
  on: boolean,
  onTap: () => void,
): { view: Container; set(on: boolean): void } => {
  const view = new Container();
  view.label = name;
  view.position.set(CX, y);
  view.eventMode = 'static';
  view.cursor = 'pointer';
  const label = makeText(text, 18, COLORS.outline);
  label.anchor.set(0, 0.5);
  label.x = -PANEL.w / 2 + 28;
  const track = new Graphics();
  track.x = PANEL.w / 2 - 56;
  const knob = new Graphics().circle(0, 0, 13).fill(0xffffff);
  const set = (v: boolean): void => {
    track
      .clear()
      .roundRect(-28, -17, 56, 34, 17)
      .fill(v ? COLORS.button : COLORS.switchOff);
    knob.position.set(track.x + (v ? 11 : -11), 0);
  };
  const hit = new Graphics()
    .rect(-PANEL.w / 2 + 14, -22, PANEL.w - 28, 44)
    .fill({ color: 0xffffff, alpha: 0.001 });
  view.addChild(hit, label, track, knob);
  view.on('pointertap', onTap);
  set(on);
  return { view, set };
};

/**
 * Réglages, comme passe-trappe et math-river : le nombre de lapins (propre à ce jeu), le mode
 * tap, et le choix des calculs.
 */
export function createSettingsScene(deps: {
  initial: Settings;
  onOpenCalcsPicker(current: Pair[]): Promise<Pair[]>;
  onClose(next: Settings): void;
}): SettingsScene {
  let rabbits = deps.initial.rabbitsCount;
  let tapMode = deps.initial.tapMode;
  let pairs = deps.initial.selectedPairs;
  let destroyed = false;

  const pick = (): void => {
    void deps.onOpenCalcsPicker(pairs).then(
      (next) => {
        // Le sélecteur peut se refermer après la destruction du panneau : on ignore alors.
        if (!destroyed) pairs = next;
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
      .roundRect(CX - PANEL.w / 2, CY - PANEL.h / 2, PANEL.w, PANEL.h, 24)
      .fill(COLORS.signFill),
  );

  const title = makeText('Réglages', 30, COLORS.outline);
  title.position.set(CX, CY - 148);
  const caption = makeText('Nombre de lapins', 18, COLORS.outline);
  caption.position.set(CX, CY - 106);
  const value = makeText(String(rabbits), 32, COLORS.outline);
  value.position.set(CX, CY - 66);
  const setRabbits = (n: number): void => {
    rabbits = Math.max(RABBITS_MIN, Math.min(RABBITS_MAX, n)) as RabbitsCount;
    value.text = String(rabbits);
  };
  const toggle = makeSwitch('tapMode', 'Mode tap (accessibilité)', CY - 6, tapMode, () => {
    tapMode = !tapMode;
    toggle.set(tapMode);
  });

  view.addChild(
    title,
    caption,
    value,
    makeButton('−', 'minus', CX - 80, CY - 66, 56, 44, () => setRabbits(rabbits - 1), 26),
    makeButton('+', 'plus', CX + 80, CY - 66, 56, 44, () => setRabbits(rabbits + 1), 26),
    toggle.view,
    makeButton('Choisir les calculs', 'calcs', CX, CY + 60, 290, 50, pick),
    makeButton('Fermer', 'close', CX, CY + 130, 150, 50, () =>
      deps.onClose({ selectedPairs: pairs, rabbitsCount: rabbits, tapMode }),
    ),
  );

  return {
    id: 'settings',
    view,
    rabbitsCount: () => rabbits,
    onEnter: () => {},
    onExit: () => {},
    onTick: () => {},
    pause: () => {},
    resume: () => {},
    destroy: () => {
      destroyed = true;
      view.destroy({ children: true });
    },
  };
}
