import {
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MAX_STRETCH,
  MID_Y,
  PUCK_RADIUS,
} from '../config/dimensions';
import { elasticLine } from './elastic';
import { PLAYERS, type Player, type Vec } from './types';

export function campOf(y: number): Player {
  return y >= MID_Y ? 'A' : 'B';
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Position autorisée pour un palet tenu par `player` : son camp, élastique étiré au plus de MAX_STRETCH. */
export function clampToCamp(p: Vec, player: Player): Vec {
  const x = clamp(p.x, PUCK_RADIUS, DESIGN_WIDTH - PUCK_RADIUS);
  const nearDivider = DIVIDER_THICKNESS / 2 + PUCK_RADIUS;
  const line = elasticLine(player);
  const y =
    player === 'A'
      ? clamp(p.y, MID_Y + nearDivider, line.y + MAX_STRETCH)
      : clamp(p.y, line.y - MAX_STRETCH, MID_Y - nearDivider);
  return { x, y };
}

export interface WinDetector {
  /** `counts` : palets par camp ; renvoie le vainqueur (définitif jusqu'au reset) ou null. */
  update(counts: Record<Player, number>, dtMs: number): Player | null;
  reset(): void;
}

export function createWinDetector(holdMs = 1000): WinDetector {
  const empty: Record<Player, number> = { A: 0, B: 0 };
  let winner: Player | null = null;
  return {
    update: (counts, dtMs) => {
      if (winner) return winner;
      for (const p of PLAYERS) {
        empty[p] = counts[p] === 0 ? empty[p] + dtMs : 0;
        if (empty[p] >= holdMs) winner = p;
      }
      return winner;
    },
    reset: () => {
      empty.A = 0;
      empty.B = 0;
      winner = null;
    },
  };
}
