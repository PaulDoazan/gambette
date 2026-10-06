import { MouseJoint, Vec2, type Body, type Contact } from 'planck';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import type { Puck } from '../entities/Puck';
import { DRAG_MAX_FORCE_PER_KG, DROP_MAX_SPEED, PUSHED_MAX_SPEED } from '../config/physics';
import { MAX_STRETCH, PUCK_RADIUS } from '../config/dimensions';
import { campOf, clampToCamp } from '../domain/rules';
import { elasticLine, launchVelocity, stretchOf } from '../domain/elastic';
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
  /** Position du palet au début du glisser : un mauvais palet tiré y revient. */
  start: Vec;
}

const GRAB_RADIUS = PUCK_RADIUS * 1.3;

export function createDragController(deps: {
  physics: PhysicsWorld;
  pucks: () => readonly Puck[];
  canLaunch?: (puck: Puck) => boolean;
  /** Élastique de `player` relâché après un étirement de `stretch` px (il vibre). */
  onElasticRelease?: (player: Player, stretch: number) => void;
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
      if (campOf(q.y) !== player || puck.isFlipping()) continue;
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
  // Corps → palet, reconstruit à chaque saisie : le handler de contact ne parcourt jamais la liste.
  const byBody = new Map<Body, Puck>();
  const rebuildIndex = (): void => {
    byBody.clear();
    for (const puck of deps.pucks()) byBody.set(puck.body, puck);
  };
  const isHeld = (puck: Puck): boolean => {
    for (const g of grabs.values()) if (g.puck === puck) return true;
    return false;
  };
  const onPostSolve = (contact: Contact): void => {
    if (grabs.size === 0) return;
    const a = byBody.get(contact.getFixtureA().getBody());
    const b = byBody.get(contact.getFixtureB().getBody());
    if (!a || !b) return;
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

  /** Centre du palet devant l'élastique de `player` (côté cloison). */
  const inFrontOf = (p: Vec, player: Player): boolean => {
    const line = elasticLine(player);
    return player === 'A' ? p.y <= line.y : p.y >= line.y;
  };

  const release = (player: Player, launch: boolean): void => {
    const grab = grabs.get(player);
    if (!grab) return;
    physics.world.destroyJoint(grab.joint);
    grabs.delete(player);
    const { puck } = grab;
    const v = launch ? launchVelocity(puck.position(), elasticLine(player), player) : null;
    const allowed = deps.canLaunch?.(puck) ?? true;
    if (v) {
      const stretch = Math.min(
        stretchOf(puck.position(), elasticLine(player), player),
        MAX_STRETCH,
      );
      deps.onElasticRelease?.(player, stretch);
    }
    if (v && !allowed) {
      // Mauvais palet tiré à l'élastique : il ne part pas. Son corps revient aussitôt, immobile, là
      // où le glisser a commencé ; sa vue y retourne en se retournant comme une pièce lancée.
      const releasedAt = puck.position();
      puck.setVelocity({ x: 0, y: 0 });
      puck.body.setAngularVelocity(0);
      puck.setPosition(grab.start);
      puck.flip(releasedAt);
      puck.syncView();
      puck.setIgnoreElastic(!inFrontOf(grab.start, player));
      return;
    }
    if (v) {
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
    // Derrière la ligne, l'élastique reste ignoré : la scène ramène le palet devant avant de le réarmer.
    if (inFrontOf(puck.position(), player)) puck.setIgnoreElastic(false);
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
      rebuildIndex();
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
      grabs.set(player, { puck, joint, start: puck.position() });
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
