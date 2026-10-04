import { MouseJoint, Vec2, type Contact } from 'planck';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import type { Puck } from '../entities/Puck';
import {
  DRAG_MAX_FORCE_PER_KG,
  DROP_MAX_SPEED,
  PUSHED_MAX_SPEED,
  VIBRATE_MS,
  WRONG_LAUNCH_SPEED,
} from '../config/physics';
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
  canLaunch?: (puck: Puck) => boolean;
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

  // Palets poussés par un palet tenu pendant le sous-pas : leur vitesse est plafonnée juste après.
  const pushed = new Set<Puck>();
  const puckOf = (body: unknown): Puck | undefined => deps.pucks().find((p) => p.body === body);
  const onPostSolve = (contact: Contact): void => {
    const a = puckOf(contact.getFixtureA().getBody());
    const b = puckOf(contact.getFixtureB().getBody());
    if (!a || !b) return;
    const isHeld = (p: Puck): boolean => [...grabs.values()].some((g) => g.puck === p);
    if (isHeld(a) && !isHeld(b)) pushed.add(b);
    else if (isHeld(b) && !isHeld(a)) pushed.add(a);
  };
  physics.world.on('post-solve', onPostSolve);
  const offAfterStep = physics.onAfterStep(() => {
    for (const puck of pushed) {
      const v = puck.velocity();
      const speed = Math.hypot(v.x, v.y);
      if (speed > PUSHED_MAX_SPEED) {
        const k = PUSHED_MAX_SPEED / speed;
        puck.setVelocity({ x: v.x * k, y: v.y * k });
      }
    }
    pushed.clear();
  });

  const release = (player: Player, launch: boolean): void => {
    const grab = grabs.get(player);
    if (!grab) return;
    physics.world.destroyJoint(grab.joint);
    grabs.delete(player);
    const { puck } = grab;
    const v = launch ? launchVelocity(puck.position(), elasticLine(player), player) : null;
    const allowed = deps.canLaunch?.(puck) ?? true;
    if (launch && !allowed) {
      // Mauvais palet : il vibre et ne part presque pas.
      puck.vibrate(VIBRATE_MS);
      if (v) {
        const n = Math.hypot(v.x, v.y);
        puck.setVelocity({ x: (v.x / n) * WRONG_LAUNCH_SPEED, y: (v.y / n) * WRONG_LAUNCH_SPEED });
        return;
      }
    } else if (v) {
      puck.setVelocity(v);
      return;
    }
    // Pas de lancer élastique : la vitesse du geste est plafonnée (direction conservée).
    const cur = puck.velocity();
    const speed = Math.hypot(cur.x, cur.y);
    if (speed > DROP_MAX_SPEED) {
      const k = DROP_MAX_SPEED / speed;
      puck.setVelocity({ x: cur.x * k, y: cur.y * k });
    }
    puck.setIgnoreElastic(false);
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
      physics.world.off('post-solve', onPostSolve);
      offAfterStep();
      for (const player of [...grabs.keys()]) release(player, false);
      router.reset();
    },
  };
}
