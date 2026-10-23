import { MID_Y } from '../config/dimensions';
import type { Player } from './types';

/** Moitié d'écran : A en bas, B en haut. */
export function sideOf(y: number): Player {
  return y >= MID_Y ? 'A' : 'B';
}

export interface TouchRouter {
  /** Attribue le pointeur au joueur de la moitié où il commence ; null si ce joueur tient déjà un doigt. */
  begin(pointerId: number, y: number): Player | null;
  owner(pointerId: number): Player | null;
  end(pointerId: number): void;
  reset(): void;
}

export function createTouchRouter(): TouchRouter {
  const active = new Map<Player, number>();
  const ownerOf = (id: number): Player | null => {
    for (const [p, pid] of active) if (pid === id) return p;
    return null;
  };
  return {
    begin: (id, y) => {
      const player = sideOf(y);
      if (active.has(player)) return null;
      active.set(player, id);
      return player;
    },
    owner: ownerOf,
    end: (id) => {
      const p = ownerOf(id);
      if (p) active.delete(p);
    },
    reset: () => active.clear(),
  };
}
