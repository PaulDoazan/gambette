import {
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MAX_STRETCH,
  MID_Y,
  NO_DRAG_RADIUS,
  PUCK_RADIUS,
} from '../config/dimensions';
import { elasticLine } from './elastic';
import { PLAYERS, type Player, type Vec } from './types';

export function campOf(y: number): Player {
  return y >= MID_Y ? 'A' : 'B';
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/**
 * Position autorisée pour un palet tenu par `player` : dans son camp, entre la cloison et
 * l'élastique (le bord du palet l'étire d'au plus MAX_STRETCH), et entièrement hors du
 * demi-cercle interdit autour du passage : un palet poussé dedans est ramené sur son bord, dans
 * la même direction depuis le passage. Le palet tenu ne peut ainsi pas pousser les autres à
 * travers le trou.
 */
export function clampToCamp(p: Vec, player: Player): Vec {
  const x = clamp(p.x, PUCK_RADIUS, DESIGN_WIDTH - PUCK_RADIUS);
  const line = elasticLine(player);
  const front = DIVIDER_THICKNESS / 2 + PUCK_RADIUS;
  const y =
    player === 'A'
      ? clamp(p.y, MID_Y + front, line.y + MAX_STRETCH - PUCK_RADIUS)
      : clamp(p.y, line.y - MAX_STRETCH + PUCK_RADIUS, MID_Y - front);
  const dx = x - DESIGN_WIDTH / 2;
  const dy = y - MID_Y;
  const d = Math.hypot(dx, dy);
  const limit = NO_DRAG_RADIUS + PUCK_RADIUS;
  if (d >= limit) return { x, y };
  // dy n'est jamais nul ici (le palet est tenu à distance de la cloison).
  const k = limit / d;
  return { x: DESIGN_WIDTH / 2 + dx * k, y: MID_Y + dy * k };
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
