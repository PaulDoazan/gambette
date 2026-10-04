import { MouseJoint, Vec2 } from 'planck';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import type { Puck } from '../entities/Puck';
import { DRAG_MAX_FORCE_PER_KG, DROP_MAX_SPEED } from '../config/physics';
import { PUCK_RADIUS } from '../config/dimensions';
import { campOf, clampToCamp } from '../domain/rules';
import { elasticLine, launchVelocity } from '../domain/elastic';
import { createTouchRouter } from '../domain/touchRouting';
import type { Player, Vec } from '../domain/types';

export interface DragController {
  pointerDown(id: number, p: Vec): void;
  pointerMove(id: number, p: Vec): void;
  pointerUp(id: number): void;
  held(player: Player): Puck | null;
  reset(): void;
  destroy(): void;
}

interface Grab {
  puck: Puck;
  joint: MouseJoint;
}

const GRAB_RADIUS = PUCK_RADIUS * 1.3;

export function createDragController(deps: {
  physics: PhysicsWorld;
  pucks: () => readonly Puck[];
}): DragController {
  const { physics } = deps;
  const router = createTouchRouter();
  const grabs = new Map<Player, Grab>();
  const toTarget = (p: Vec) => Vec2(physics.toM(p.x), physics.toM(p.y));

  const pick = (p: Vec, player: Player): Puck | null => {
    let best: Puck | null = null;
    let bestD = GRAB_RADIUS;
    for (const puck of deps.pucks()) {
      const q = puck.position();
      if (campOf(q.y) !== player) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= bestD && ![...grabs.values()].some((g) => g.puck === puck)) {
        best = puck;
        bestD = d;
      }
    }
    return best;
  };

  const release = (player: Player, launch: boolean): void => {
    const grab = grabs.get(player);
    if (!grab) return;
    physics.world.destroyJoint(grab.joint);
    grabs.delete(player);
    const v = launch ? launchVelocity(grab.puck.position(), elasticLine(player), player) : null;
    if (v) {
      grab.puck.setVelocity(v);
      return;
    }
    // Pas de lancer élastique : la vitesse du geste est plafonnée (direction conservée).
    const cur = grab.puck.velocity();
    const speed = Math.hypot(cur.x, cur.y);
    if (speed > DROP_MAX_SPEED) {
      const k = DROP_MAX_SPEED / speed;
      grab.puck.setVelocity({ x: cur.x * k, y: cur.y * k });
    }
    grab.puck.setIgnoreElastic(false);
  };

  return {
    pointerDown: (id, p) => {
      const player = router.begin(id, p.y);
      if (!player) return;
      const puck = pick(p, player);
      if (!puck) {
        router.end(id);
        return;
      }
      puck.setIgnoreElastic(true);
      const mass = puck.body.getMass();
      const joint = physics.world.createJoint(
        new MouseJoint(
          { maxForce: DRAG_MAX_FORCE_PER_KG * mass, frequencyHz: 8, dampingRatio: 0.9 },
          physics.ground,
          puck.body,
          puck.body.getPosition(),
        ),
      )!;
      joint.setTarget(toTarget(clampToCamp(p, player)));
      grabs.set(player, { puck, joint });
    },
    pointerMove: (id, p) => {
      const player = router.owner(id);
      const grab = player ? grabs.get(player) : undefined;
      if (player && grab) grab.joint.setTarget(toTarget(clampToCamp(p, player)));
    },
    pointerUp: (id) => {
      const player = router.owner(id);
      router.end(id);
      if (player) release(player, true);
    },
    held: (player) => grabs.get(player)?.puck ?? null,
    reset: () => {
      for (const player of [...grabs.keys()]) release(player, false);
      router.reset();
    },
    destroy: () => {
      for (const player of [...grabs.keys()]) release(player, false);
      router.reset();
    },
  };
}
