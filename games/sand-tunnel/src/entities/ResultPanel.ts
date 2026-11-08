import { Container, Graphics, Text } from 'pixi.js';
import { RESULT_PANEL } from '../config/dimensions';
import { COLORS } from '../config/theme';

/** Durée de la teinte rouge après une erreur, et du gonflement au bon calcul (ms). */
const FLASH_MS = 700;

export interface ResultPanel {
  readonly view: Container;
  /** Résultat à retrouver, et le calcul en cours (un « ? » par élément pas encore creusé). */
  show(result: number, parts: readonly string[]): void;
  text(): string;
  flash(kind: 'wrong' | 'right'): void;
  update(dtMs: number): void;
}

/** Panneau du résultat, en haut au centre : « ? ? ? = 42 », complété à mesure qu'on creuse. */
export function createResultPanel(): ResultPanel {
  const view = new Container();
  view.label = 'result-panel';
  view.position.set(RESULT_PANEL.x, RESULT_PANEL.y);
  const { w, h } = RESULT_PANEL;
  const bg = new Graphics()
    .roundRect(-w / 2 + 4, -h / 2 + 8, w, h, 22)
    .fill({ color: COLORS.pitLine, alpha: 0.3 })
    .roundRect(-w / 2, -h / 2, w, h, 22)
    .fill(COLORS.calcFill)
    .stroke({ width: 5, color: COLORS.divider });
  const label = new Text({
    text: '',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 50,
      fontWeight: '800',
      fill: COLORS.calcText,
    },
  });
  label.anchor.set(0.5);
  view.addChild(bg, label);
  let flash: { kind: 'wrong' | 'right'; age: number } | null = null;

  return {
    view,
    show: (result, parts) => {
      const slots = [0, 1, 2].map((i) => parts[i] ?? '?');
      label.text = `${slots.join(' ')} = ${result}`;
    },
    text: () => label.text,
    flash: (kind) => {
      flash = { kind, age: 0 };
    },
    update: (dtMs) => {
      if (!flash) return;
      flash.age += dtMs;
      const k = Math.max(0, 1 - flash.age / FLASH_MS);
      if (flash.kind === 'wrong') {
        label.style.fill = k > 0 ? COLORS.miss : COLORS.calcText;
        view.x = RESULT_PANEL.x + Math.sin(flash.age / 25) * 6 * k;
      } else {
        view.scale.set(1 + 0.12 * Math.sin(Math.min(1, flash.age / FLASH_MS) * Math.PI));
      }
      if (k === 0) {
        label.style.fill = COLORS.calcText;
        view.x = RESULT_PANEL.x;
        view.scale.set(1);
        flash = null;
      }
    },
  };
}
