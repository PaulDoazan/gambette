import { Container, Graphics, Text } from 'pixi.js';
import { opSymbol } from '@gambette/math-sdk';
import { GALLERY_WIDTH, GROOVE_WIDTH, NODE_RADIUS, OP_HALF } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { NetNode, Network } from '../domain/network';
import { slice } from '../domain/route';
import type { Vec } from '../domain/types';
import { SAND_DRY } from './SandFall';

/** Durée d'une secousse de galet fautif (ms). */
const SHAKE_MS = 450;

export type NodeState = 'idle' | 'dug' | 'wet';

export interface NetworkView {
  /** Sillons (liaisons possibles) et galeries creusées, sous l'eau. */
  readonly ground: Container;
  /** Galets et leurs nombres ou opérateurs, au-dessus de l'eau. */
  readonly stones: Container;
  /**
   * Galerie creusée le long de `route` (de la mare au doigt). De `sandFrom` à la fin, le sable
   * la rebouche, d'autant plus que `sandK` approche 1.
   */
  setGallery(route: readonly Vec[], sandFrom?: number, sandK?: number): void;
  setNodeState(id: number, state: NodeState): void;
  shake(id: number): void;
  update(dtMs: number): void;
}

const line = (g: Graphics, pts: readonly Vec[]): Graphics => {
  g.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
  return g;
};

const label = (text: string, size: number): Text => {
  const t = new Text({
    text,
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: size,
      fontWeight: '800',
      fill: COLORS.calcText,
    },
  });
  t.anchor.set(0.5);
  return t;
};

function drawStone(g: Graphics, node: NetNode, state: NodeState): void {
  g.clear();
  const ring =
    state === 'idle'
      ? { width: 4, color: COLORS.toyLine }
      : { width: 7, color: state === 'wet' ? COLORS.waterLight : COLORS.waterEdge };
  // Ombre portée sur le sable : le galet est posé dessus.
  if (node.kind === 'op') {
    g.roundRect(-OP_HALF + 3, -OP_HALF + 6, OP_HALF * 2, OP_HALF * 2, 14).fill({
      color: COLORS.pitLine,
      alpha: 0.35,
    });
    g.roundRect(-OP_HALF, -OP_HALF, OP_HALF * 2, OP_HALF * 2, 14)
      .fill(COLORS.button)
      .stroke(ring);
  } else {
    g.circle(3, 6, NODE_RADIUS).fill({ color: COLORS.pitLine, alpha: 0.35 });
    g.circle(0, 0, NODE_RADIUS).fill(COLORS.calcFill).stroke(ring);
    g.ellipse(-12, -16, 12, 6).fill({ color: 0xffffff, alpha: 0.7 });
  }
}

/** Réseau d'un écran : sillons, galerie creusée et galets. */
export function createNetworkView(net: Network): NetworkView {
  const ground = new Container();
  ground.label = 'network-ground';
  const grooves = new Graphics();
  const at = (id: number): Vec => net.nodes[id]!.pos;
  const segs: Vec[][] = [
    ...net.nodes.filter((n) => n.kind === 'start').map((n) => [net.pond, n.pos]),
    ...net.links.map(([a, b]) => [at(a), at(b)]),
    ...net.nodes.filter((n) => n.kind === 'end').map((n) => [n.pos, net.exit]),
  ];
  for (const s of segs) {
    line(grooves, s).stroke({
      width: GROOVE_WIDTH + 4,
      color: COLORS.sandGrainDark,
      alpha: 0.35,
      cap: 'round',
    });
    line(grooves, s).stroke({ width: GROOVE_WIDTH - 4, color: COLORS.rim, cap: 'round' });
  }
  const gallery = new Graphics();
  ground.addChild(grooves, gallery);

  const stones = new Container();
  stones.label = 'network-stones';
  const views = net.nodes.map((node) => {
    const c = new Container();
    c.label = `stone-${node.id}`;
    c.position.set(node.pos.x, node.pos.y);
    const g = new Graphics();
    drawStone(g, node, 'idle');
    const text = node.kind === 'op' ? label(opSymbol(node.op), 52) : label(String(node.value), 40);
    c.addChild(g, text);
    stones.addChild(c);
    return { node, c, g, state: 'idle' as NodeState, shake: 0 };
  });

  return {
    ground,
    stones,
    setGallery: (route, sandFrom = Infinity, sandK = 0) => {
      gallery.clear();
      if (route.length < 2) return;
      const style = { cap: 'round', join: 'round' } as const;
      line(gallery, route).stroke({ width: GALLERY_WIDTH + 8, color: COLORS.pitLine, ...style });
      line(gallery, route).stroke({ width: GALLERY_WIDTH, color: COLORS.pit, ...style });
      line(gallery, route).stroke({
        width: GALLERY_WIDTH * 0.4,
        color: COLORS.pitDeep,
        alpha: 0.45,
        ...style,
      });
      if (sandK > 0 && Number.isFinite(sandFrom)) {
        const filled = slice(route, sandFrom, Number.MAX_SAFE_INTEGER);
        if (filled.length >= 2) {
          line(gallery, filled).stroke({
            width: GALLERY_WIDTH + 10,
            color: SAND_DRY,
            alpha: Math.min(1, sandK),
            ...style,
          });
        }
      }
    },
    setNodeState: (id, state) => {
      const v = views[id];
      if (!v || v.state === state) return;
      v.state = state;
      drawStone(v.g, v.node, state);
    },
    shake: (id) => {
      const v = views[id];
      if (v) v.shake = SHAKE_MS;
    },
    update: (dtMs) => {
      for (const v of views) {
        if (v.shake <= 0) continue;
        v.shake = Math.max(0, v.shake - dtMs);
        const k = v.shake / SHAKE_MS;
        v.c.x = v.node.pos.x + Math.sin(v.shake / 22) * 8 * k;
      }
    },
  };
}
