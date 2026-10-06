import { Container, Graphics, Text } from 'pixi.js';
import { Circle, Vec2, type Body } from 'planck';
import type { PhysicsWorld, FixtureTag } from '../core/PhysicsWorld';
import { PUCK_RADIUS, PUCK_THICKNESS } from '../config/dimensions';
import {
  CATEGORY,
  PUCK_DENSITY,
  PUCK_FRICTION,
  PUCK_LINEAR_DAMPING,
  PUCK_RESTITUTION,
} from '../config/physics';
import { COLORS } from '../config/theme';
import { FLIP_LIFT, FLIP_MS, FLIP_TURNS } from '../config/physics';
import { campOf } from '../domain/rules';
import type { Vec } from '../domain/types';

export interface Puck {
  readonly view: Container;
  readonly body: Body;
  position(): Vec;
  /** px/s */
  velocity(): Vec;
  setVelocity(v: Vec): void;
  setPosition(p: Vec): void;
  /** true : le palet traverse l'élastique (palet tenu ou tout juste lancé). */
  setIgnoreElastic(on: boolean): void;
  ignoresElastic(): boolean;
  /** Valeur affichée sur le palet (null : aucune). */
  setLabel(value: number | null): void;
  label(): number | null;
  /**
   * Retournement visuel « pièce lancée » depuis `from` jusqu'à la position physique du palet
   * (mauvais palet tiré). Le corps physique ne bouge pas.
   */
  flip(from: Vec): void;
  isFlipping(): boolean;
  /**
   * Met la vue à jour : position, rotation, étiquette droite pour le joueur du camp ; fait
   * avancer le retournement de `dtMs`.
   */
  syncView(dtMs?: number): void;
  destroy(): void;
}

const PUCK_TAG: FixtureTag = { kind: 'puck' };
const MASK_ALL = CATEGORY.PUCK | CATEGORY.WALL | CATEGORY.ELASTIC;
const MASK_NO_ELASTIC = CATEGORY.PUCK | CATEGORY.WALL;

const drawPuck = (g: Graphics): void => {
  g.circle(0, 0, PUCK_RADIUS).fill(COLORS.puck).stroke({ width: 4, color: COLORS.puckEdge });
  g.circle(0, 0, PUCK_RADIUS * 0.45).stroke({ width: 2, color: COLORS.puckEdge });
};

/**
 * Tranche d'un palet vu de biais : `squash` = écrasement de la face (cos de l'angle de
 * retournement), `depth` = décalage de la face arrière à l'écran (épaisseur × sin de l'angle).
 */
const drawEdge = (e: Graphics, squash: number, depth: number): void => {
  const ry = PUCK_RADIUS * Math.abs(squash);
  e.clear();
  e.ellipse(0, depth, PUCK_RADIUS, ry).fill(COLORS.puckEdge);
  e.rect(-PUCK_RADIUS, Math.min(0, depth), 2 * PUCK_RADIUS, Math.abs(depth)).fill(COLORS.puckEdge);
};

export function createPuck(physics: PhysicsWorld, at: Vec): Puck {
  const { toM, toPx } = physics;
  const body = physics.world.createBody({
    type: 'dynamic',
    position: Vec2(toM(at.x), toM(at.y)),
    bullet: true,
    linearDamping: PUCK_LINEAR_DAMPING,
    angularDamping: 2,
  });
  const fixture = body.createFixture({
    shape: new Circle(toM(PUCK_RADIUS)),
    density: PUCK_DENSITY,
    friction: PUCK_FRICTION,
    restitution: PUCK_RESTITUTION,
    filterCategoryBits: CATEGORY.PUCK,
    filterMaskBits: MASK_ALL,
    userData: PUCK_TAG,
  });
  const view = new Container();
  // Tranche (cylindre) dessinée sous la face, seulement pendant un retournement.
  const edge = new Graphics();
  edge.label = 'edge';
  edge.visible = false;
  // Face : disque et étiquette, écrasée puis inversée quand le palet tourne comme une pièce.
  const face = new Container();
  face.label = 'face';
  const g = new Graphics();
  drawPuck(g);
  face.addChild(g);
  view.addChild(edge, face);
  const text = new Text({
    text: '',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 44,
      fontWeight: '800',
      fill: COLORS.puckText,
    },
  });
  text.label = 'value';
  text.anchor.set(0.5);
  face.addChild(text);
  let ignoring = false;
  let value: number | null = null;
  let flipFrom: Vec | null = null;
  let flipElapsed = 0;

  const api: Puck = {
    view,
    body,
    position: () => {
      const p = body.getPosition();
      return { x: toPx(p.x), y: toPx(p.y) };
    },
    velocity: () => {
      const v = body.getLinearVelocity();
      return { x: toPx(v.x), y: toPx(v.y) };
    },
    setVelocity: (v) => {
      body.setLinearVelocity(Vec2(toM(v.x), toM(v.y)));
      body.setAwake(true);
    },
    setPosition: (p) => {
      body.setPosition(Vec2(toM(p.x), toM(p.y)));
      body.setAwake(true);
    },
    setIgnoreElastic: (on) => {
      ignoring = on;
      fixture.setFilterData({
        groupIndex: 0,
        categoryBits: CATEGORY.PUCK,
        maskBits: on ? MASK_NO_ELASTIC : MASK_ALL,
      });
    },
    ignoresElastic: () => ignoring,
    setLabel: (v) => {
      value = v;
      text.text = v === null ? '' : String(v);
    },
    label: () => value,
    flip: (from) => {
      flipFrom = { ...from };
      flipElapsed = 0;
    },
    isFlipping: () => flipFrom !== null,
    syncView: (dtMs = 0) => {
      const p = api.position();
      if (flipFrom) {
        flipElapsed += dtMs;
        if (flipElapsed >= FLIP_MS) flipFrom = null;
      }
      if (flipFrom) {
        const t = flipElapsed / FLIP_MS;
        const ease = t * t * (3 - 2 * t);
        view.position.set(
          flipFrom.x + (p.x - flipFrom.x) * ease,
          flipFrom.y + (p.y - flipFrom.y) * ease,
        );
        // Saut : plus gros au sommet. Tours de pièce : la face s'écrase puis s'inverse, et la
        // tranche (épaisseur) apparaît, maximale quand le palet est de profil.
        const lift = 1 + FLIP_LIFT * Math.sin(Math.PI * t);
        view.scale.set(lift, lift);
        const phi = 2 * Math.PI * FLIP_TURNS * t;
        face.scale.y = Math.cos(phi);
        drawEdge(edge, Math.cos(phi), PUCK_THICKNESS * Math.sin(phi));
        edge.visible = true;
      } else {
        view.position.set(p.x, p.y);
        view.scale.set(1, 1);
        face.scale.y = 1;
        edge.visible = false;
      }
      const angle = body.getAngle();
      view.rotation = angle;
      // Étiquette droite pour le joueur du camp où se trouve le palet.
      text.rotation = (campOf(p.y) === 'B' ? Math.PI : 0) - angle;
    },
    destroy: () => {
      physics.world.destroyBody(body);
      view.destroy({ children: true });
    },
  };
  api.syncView();
  return api;
}
