import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { ASSET_URLS } from '../assets';
import { Tween } from '@tweenjs/tween.js';
import { tweenGroup, tweenObject } from './animations/Tween';
import { CARROT_GROUND_Y } from '../config/dimensions';

export interface Vec {
  x: number;
  y: number;
}

const CARROT_URL = ASSET_URLS.carrot;
const SOURCE_WIDTH = 248;
const SOURCE_HEIGHT = 631;
const HALF_WIDTH = SOURCE_WIDTH / 2;
const HALF_HEIGHT = SOURCE_HEIGHT / 2;
const SPRITE_WIDTH = 8;
const SPRITE_HEIGHT = (SPRITE_WIDTH * HALF_HEIGHT) / HALF_WIDTH;

const FLIGHT_DURATION_MS = 600;
const FLIGHT_DISTANCE = 110;
const PEAK_LIFT = 70;
const REST_BEFORE_FADE_MS = 1500;
const FADE_DURATION_MS = 400;
const SPIN_TURNS = 2;

type Side = 'left' | 'right';

interface PieceParams {
  dirX: number;
  startOffset: Vec;
  distanceMul: number;
  peakMul: number;
  spinTurns: number;
  spinSign: 1 | -1;
  side: Side;
}

const PIECES: ReadonlyArray<Omit<PieceParams, 'dirX'>> = [
  {
    startOffset: { x: -2, y: -1 },
    distanceMul: 0.78,
    peakMul: 1.18,
    spinTurns: SPIN_TURNS,
    spinSign: 1,
    side: 'left',
  },
  {
    startOffset: { x: 2, y: 1 },
    distanceMul: 1.18,
    peakMul: 0.85,
    spinTurns: SPIN_TURNS - 0.5,
    spinSign: -1,
    side: 'right',
  },
];

const buildQuarterTexture = (side: Side): Texture => {
  const base = Texture.from(CARROT_URL);
  const x = side === 'left' ? 0 : HALF_WIDTH;
  return new Texture({
    source: base.source,
    frame: new Rectangle(x, 0, HALF_WIDTH, HALF_HEIGHT),
  });
};

const buildSprite = (side: Side): Sprite => {
  const s = new Sprite(buildQuarterTexture(side));
  s.anchor.set(0.5);
  s.width = SPRITE_WIDTH;
  s.height = SPRITE_HEIGHT;
  return s;
};

interface ArcPath {
  x0: number;
  y0: number;
  endX: number;
  endY: number;
  peakY: number;
  spin: number;
}

const arcPathFor = (start: Vec, params: PieceParams): ArcPath => {
  const x0 = start.x + params.startOffset.x;
  const y0 = start.y + params.startOffset.y;
  return {
    x0,
    y0,
    endX: x0 + params.dirX * FLIGHT_DISTANCE * params.distanceMul,
    endY: CARROT_GROUND_Y - SPRITE_HEIGHT / 2,
    peakY: y0 - PEAK_LIFT * params.peakMul,
    spin: params.spinSign * params.spinTurns * Math.PI * 2,
  };
};

const stepSprite = (sprite: Sprite, p: ArcPath, t: number): void => {
  const oneMinus = 1 - t;
  const x = p.x0 + (p.endX - p.x0) * t;
  const y = oneMinus * oneMinus * p.y0 + 2 * oneMinus * t * p.peakY + t * t * p.endY;
  sprite.position.set(x, y);
  sprite.rotation = p.spin * t;
};

const flyParabolic = (sprite: Sprite, start: Vec, params: PieceParams): Promise<void> => {
  const path = arcPathFor(start, params);
  return new Promise((resolve) => {
    new Tween({ t: 0 }, tweenGroup)
      .to({ t: 1 }, FLIGHT_DURATION_MS)
      .onUpdate((obj) => stepSprite(sprite, path, obj.t))
      .onComplete(() => resolve())
      .start();
  });
};

const animatePiece = async (
  parent: Container,
  mouth: Vec,
  params: PieceParams,
  delay: (ms: number) => Promise<void>,
): Promise<void> => {
  const sprite = buildSprite(params.side);
  sprite.position.set(mouth.x + params.startOffset.x, mouth.y + params.startOffset.y);
  parent.addChild(sprite);
  await flyParabolic(sprite, mouth, params);
  await delay(REST_BEFORE_FADE_MS);
  await tweenObject(sprite, { alpha: 0 }, FADE_DURATION_MS);
  sprite.parent?.removeChild(sprite);
};

export async function spawnHalfCarrotEffect(
  parent: Container,
  mouth: Vec,
  impactVel: Vec,
  delay: (ms: number) => Promise<void>,
): Promise<void> {
  const dirX = impactVel.x > 0 ? -1 : 1;
  await Promise.all(PIECES.map((p) => animatePiece(parent, mouth, { ...p, dirX }, delay)));
}
