import { Container, Graphics, Text } from 'pixi.js';
import { opSymbol, type Pair } from '@gambette/math-sdk';
import { CALC_BLOCK, CALC_BLOCK_SIZE } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Player } from '../domain/types';
import { BURST_MS, burstFrame, drawSparks, makeSparks, type Spark } from './Burst';

export interface CalcBlock {
  readonly view: Container;
  setPair(pair: Pair): void;
  text(): string;
  /** Éclat (nouveau calcul) : le bloc rebondit, un contour jaune s'élargit et s'efface. */
  flash(): void;
  isFlashing(): boolean;
  update(dtMs: number): void;
}

/** Étincelles qui jaillissent du cadre quand le calcul change. */
const CALC_SPARKS = 16;

export function createCalcBlock(player: Player): CalcBlock {
  const view = new Container();
  view.label = `calc-${player}`;
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
  const halo = new Graphics();
  halo.visible = false;
  view.addChild(halo);
  const sparksView = new Graphics();
  sparksView.label = 'sparks';
  sparksView.visible = false;
  view.addChild(sparksView);
  let sparks: Spark[] = [];
  // Distance du centre au bord du cadre dans la direction `a`.
  const edge = (a: number): number =>
    Math.min(
      w / 2 / Math.max(Math.abs(Math.cos(a)), 1e-6),
      h / 2 / Math.max(Math.abs(Math.sin(a)), 1e-6),
    );
  let flashElapsed: number | null = null;
  return {
    view,
    setPair: (pair) => {
      label.text = `${pair.a} ${opSymbol(pair.op)} ${pair.b} = ?`;
    },
    text: () => label.text,
    flash: () => {
      flashElapsed = 0;
      sparks = makeSparks(CALC_SPARKS);
    },
    isFlashing: () => flashElapsed !== null,
    update: (dtMs) => {
      if (flashElapsed === null) return;
      flashElapsed += dtMs;
      const f = burstFrame(flashElapsed / BURST_MS);
      if (flashElapsed >= BURST_MS) flashElapsed = null;
      // Rebond plus discret que celui d'un chiffre : le bloc est grand.
      view.scale.set(1 + (f.scale - 1) * 0.3);
      halo.visible = flashElapsed !== null;
      sparksView.visible = halo.visible;
      if (sparksView.visible) drawSparks(sparksView, sparks, flashElapsed! / BURST_MS, edge, 60);
      halo.clear();
      if (halo.visible) {
        const grow = 6 + 22 * f.rays.radius;
        halo
          .roundRect(-w / 2 - grow, -h / 2 - grow, w + 2 * grow, h + 2 * grow, 18 + grow)
          .stroke({ width: 5, color: COLORS.button, alpha: f.rays.alpha });
      }
    },
  };
}
