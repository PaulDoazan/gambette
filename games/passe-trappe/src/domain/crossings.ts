import type { Player } from './types';

/** Fenêtre de regroupement des passages : au plus un renouvellement par fenêtre. */
export const RENEW_COOLDOWN_MS = 300;

export interface CrossingDetector {
  /** Mémorise les camps étiquetés (au départ, après Rejouer). */
  reset(camps: readonly Player[], nowMs: number): void;
  /**
   * true quand il faut renouveler calculs et étiquettes : les camps diffèrent de ceux du
   * dernier étiquetage et sont restés identiques entre eux depuis au moins la fenêtre
   * (anti-rebond : on renouvelle sur le front stable, jamais en plein va-et-vient). Un aller-retour
   * qui revient aux camps étiquetés ne déclenche rien ; un passage net renouvelle une seule fois.
   */
  update(camps: readonly Player[], nowMs: number): boolean;
}

const sameCamps = (a: readonly Player[], b: readonly Player[]): boolean =>
  a.length === b.length && a.every((c, i) => c === b[i]);

export function createCrossingDetector(cooldownMs = RENEW_COOLDOWN_MS): CrossingDetector {
  let labelled: Player[] = [];
  let current: Player[] = [];
  let since = 0; // dernier instant où les camps ont changé
  return {
    reset: (camps, nowMs) => {
      labelled = [...camps];
      current = [...camps];
      since = nowMs;
    },
    update: (camps, nowMs) => {
      if (!sameCamps(camps, current)) {
        current = [...camps];
        since = nowMs;
      }
      if (sameCamps(current, labelled)) return false;
      if (nowMs - since < cooldownMs) return false;
      labelled = [...current];
      return true;
    },
  };
}
