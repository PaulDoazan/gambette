import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ASSET_URLS } from '../assets';
import { DESIGN_WIDTH, DESIGN_HEIGHT, GROUND_Y } from '../config/dimensions';
import { COLORS, STROKE } from '../config/theme';

export interface Background {
  readonly view: Container;
}

const SUN_DIAMETER = 110;
const SUN_URL = ASSET_URLS.sun;

const createSun = (): Sprite => {
  const sprite = new Sprite(Texture.from(SUN_URL));
  sprite.anchor.set(0.5);
  sprite.width = SUN_DIAMETER;
  sprite.height = SUN_DIAMETER;
  sprite.x = DESIGN_WIDTH - 80;
  sprite.y = 70;
  return sprite;
};

const CLOUD_OUTLINE_PAD = 2.5;

const cloudBumps = (cx: number, cy: number, s: number): Array<[number, number, number]> => {
  const r = 18 * s;
  return [
    [cx - r * 1.1, cy + r * 0.05, r * 0.85],
    [cx - r * 0.55, cy - r * 0.55, r * 0.75],
    [cx + r * 0.05, cy - r * 0.85, r * 0.95],
    [cx + r * 0.65, cy - r * 0.55, r * 0.78],
    [cx + r * 1.15, cy + r * 0.05, r * 0.78],
    [cx + r * 0.1, cy + r * 0.1, r * 0.75],
  ];
};

const drawCloud = (g: Graphics, cx: number, cy: number, scale: number): void => {
  const bumps = cloudBumps(cx, cy, scale);
  for (const [x, y, r] of bumps) g.circle(x, y, r + CLOUD_OUTLINE_PAD).fill(COLORS.outline);
  for (const [x, y, r] of bumps) g.circle(x, y, r).fill(COLORS.cloud);
};

const drawClouds = (g: Graphics): void => {
  drawCloud(g, 180, 75, 1.0);
};

const drawHills = (g: Graphics): void => {
  const baseY = GROUND_Y;
  g.moveTo(0, baseY)
    .lineTo(0, 240)
    .quadraticCurveTo(110, 180, 230, 230)
    .quadraticCurveTo(360, 280, 500, 220)
    .quadraticCurveTo(640, 165, 760, 230)
    .quadraticCurveTo(810, 255, DESIGN_WIDTH, 215)
    .lineTo(DESIGN_WIDTH, baseY)
    .lineTo(0, baseY)
    .fill(COLORS.hills)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
};

const drawGrass = (g: Graphics): void => {
  g.rect(0, GROUND_Y, DESIGN_WIDTH, DESIGN_HEIGHT - GROUND_Y).fill(COLORS.grass);
  g.moveTo(0, GROUND_Y)
    .lineTo(DESIGN_WIDTH, GROUND_Y)
    .stroke({ width: STROKE.thick, color: COLORS.outline });
};

const drawTuft = (g: Graphics, x: number): void => {
  const y = GROUND_Y;
  g.moveTo(x - 6, y)
    .lineTo(x, y - 8)
    .lineTo(x + 6, y)
    .lineTo(x - 6, y)
    .fill(COLORS.hills)
    .stroke({ width: STROKE.normal, color: COLORS.outline });
};

const drawTufts = (g: Graphics): void => {
  drawTuft(g, 260);
  drawTuft(g, 420);
  drawTuft(g, 580);
};

export function createBackground(): Background {
  const view = new Container();
  const g = new Graphics();
  drawClouds(g);
  drawHills(g);
  drawGrass(g);
  drawTufts(g);
  view.addChild(g);
  view.addChild(createSun());
  return { view };
}
