import { Vec2, World, type Body, type Contact } from 'planck';
import { MAX_SUBSTEPS, PX_PER_M, STEP_S, WALL_RESTITUTION } from '../config/physics';

export interface PhysicsWorld {
  readonly world: World;
  /** Corps statique servant d'ancrage aux MouseJoint. */
  readonly ground: Body;
  toM(px: number): number;
  toPx(m: number): number;
  step(deltaMs: number): void;
  /** Callback exécuté après chaque sous-pas fixe ; renvoie la fonction de désinscription. */
  onAfterStep(cb: () => void): () => void;
  destroy(): void;
}

/** Données attachées aux fixtures pour reconnaître les murs dans les contacts. */
export interface FixtureTag {
  kind: 'puck' | 'wall';
}

const isWallContact = (c: Contact): boolean => {
  const a = c.getFixtureA().getUserData() as FixtureTag | null;
  const b = c.getFixtureB().getUserData() as FixtureTag | null;
  return a?.kind === 'wall' || b?.kind === 'wall';
};

export function createPhysicsWorld(): PhysicsWorld {
  const world = new World({ gravity: Vec2(0, 0) });
  const ground = world.createBody();
  // planck combine les restitutions par max : on impose celle des murs au contact.
  world.on('pre-solve', (contact: Contact) => {
    if (isWallContact(contact)) contact.setRestitution(WALL_RESTITUTION);
  });
  let pendingS = 0;
  const afterStep = new Set<() => void>();
  return {
    world,
    ground,
    toM: (px) => px / PX_PER_M,
    toPx: (m) => m * PX_PER_M,
    step: (deltaMs) => {
      pendingS = Math.min(pendingS + deltaMs / 1000, STEP_S * MAX_SUBSTEPS);
      while (pendingS >= STEP_S - 1e-9) {
        world.step(STEP_S);
        afterStep.forEach((cb) => cb());
        pendingS -= STEP_S;
      }
    },
    onAfterStep: (cb) => {
      afterStep.add(cb);
      return () => {
        afterStep.delete(cb);
      };
    },
    destroy: () => {
      afterStep.clear();
      for (let b = world.getBodyList(); b;) {
        const next = b.getNext();
        world.destroyBody(b);
        b = next;
      }
    },
  };
}
