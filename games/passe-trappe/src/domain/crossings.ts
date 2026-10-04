import type { Player } from './types';

/** Fenêtre de regroupement des passages : au plus un renouvellement par fenêtre. */
export const RENEW_COOLDOWN_MS = 300;

export interface CrossingDetector {
  /** Mémorise les camps étiquetés (au départ, après Rejouer). */
  reset(camps: readonly Player[], nowMs: number): void;
  /**
   * true quand il faut renouveler calculs et étiquettes : les camps diffèrent de ceux du
   * dernier étiquetage et la fenêtre est écoulée. Une oscillation qui revient au camp
   * étiqueté avant la fin de la fenêtre ne déclenche rien.
   */
  update(camps: readonly Player[], nowMs: number): boolean;
}

const sameCamps = (a: readonly Player[], b: readonly Player[]): boolean =>
  a.length === b.length && a.every((c, i) => c === b[i]);

export function createCrossingDetector(cooldownMs = RENEW_COOLDOWN_MS): CrossingDetector {
  let labelled: Player[] = [];
  let lastRenew = -Infinity;
  return {
    reset: (camps, nowMs) => {
      labelled = [...camps];
      lastRenew = nowMs;
    },
    update: (camps, nowMs) => {
      if (sameCamps(camps, labelled)) return false;
      if (nowMs - lastRenew < cooldownMs) return false;
      labelled = [...camps];
      lastRenew = nowMs;
      return true;
    },
  };
}
