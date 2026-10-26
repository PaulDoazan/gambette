import { Container, Graphics, Text } from 'pixi.js';
import { BUCKET_RADIUS } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Player, Vec } from '../domain/types';
import {
  BURST_MS,
  burstFrame,
  circleSparkOrigin,
  drawSparks,
  makeSparks,
  type Spark,
} from './Burst';

export interface Bucket {
  readonly view: Container;
  /** Étincelles de l'éclat : à placer dans un calque au-dessus des seaux. */
  readonly sparks: Graphics;
  readonly home: Vec;
  value(): number;
  setValue(v: number): void;
  isEmpty(): boolean;
  setEmpty(empty: boolean): void;
  position(): Vec;
  setPosition(p: Vec): void;
  /** Éclat : nouveau seau (nouveau calcul). */
  flash(): void;
  update(dtMs: number): void;
}

const R = BUCKET_RADIUS;

export function createBucket(player: Player, home: Vec): Bucket {
  const view = new Container();
  view.label = `bucket-${player}`;
  view.rotation = player === 'B' ? Math.PI : 0;
  const shell = new Graphics()
    .circle(0, 0, R)
    .fill(COLORS.bucket)
    .stroke({ width: 3, color: COLORS.bucketEdge });
  const inside = new Graphics();
  const handle = new Graphics()
    .moveTo(-R, 4)
    .quadraticCurveTo(0, R * 1.3, R, 4)
    .stroke({ width: 4, color: COLORS.bucketEdge });
  const tag = new Graphics()
    .roundRect(-34, -20, 68, 40, 10)
    .fill(COLORS.calcFill)
    .stroke({ width: 2.5, color: COLORS.calcText });
  const label = new Text({
    text: '',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 30,
      fontWeight: '800',
      fill: COLORS.calcText,
    },
  });
  label.anchor.set(0.5);
  view.addChild(shell, inside, handle, tag, label);

  const sparksView = new Graphics();
  sparksView.label = 'sparks';
  sparksView.visible = false;
  let sparks: Spark[] = [];

  let value = 0;
  let empty = false;
  let flashElapsed: number | null = null;

  const drawInside = (fullness: number): void => {
    inside.clear();
    inside
      .circle(0, 0, R - 10)
      .fill(COLORS.bucketEmpty)
      .stroke({ width: 2.5, color: COLORS.bucketEdge });
    if (fullness <= 0) return;
    inside.circle(0, 0, (R - 10) * fullness).fill(COLORS.water);
    inside
      .moveTo(-20, -14)
      .quadraticCurveTo(-10, -20, 0, -14)
      .stroke({ width: 3, color: COLORS.foam, alpha: 0.7 * fullness, cap: 'round' });
  };
  const refresh = (): void => {
    drawInside(empty ? 0 : 1);
    view.alpha = empty ? 0.45 : 1;
  };
  const setPosition = (p: Vec): void => {
    view.position.set(p.x, p.y);
    sparksView.position.set(p.x, p.y);
  };
  setPosition(home);
  refresh();

  return {
    view,
    sparks: sparksView,
    home,
    value: () => value,
    setValue: (v) => {
      value = v;
      label.text = String(v);
    },
    isEmpty: () => empty,
    setEmpty: (e) => {
      empty = e;
      refresh();
    },
    position: () => ({ x: view.x, y: view.y }),
    setPosition,
    flash: () => {
      flashElapsed = 0;
      sparks = makeSparks(14);
    },
    update: (dtMs) => {
      if (flashElapsed === null) return;
      flashElapsed += dtMs;
      const f = burstFrame(flashElapsed / BURST_MS);
      view.scale.set(f.scale * 0.6 + 0.4);
      sparksView.visible = flashElapsed < BURST_MS;
      if (sparksView.visible) {
        drawSparks(sparksView, sparks, flashElapsed / BURST_MS, circleSparkOrigin(R), 50);
      } else {
        flashElapsed = null;
        view.scale.set(1);
        sparksView.clear();
      }
    },
  };
}
