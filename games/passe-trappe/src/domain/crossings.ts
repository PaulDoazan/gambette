import type { Player } from './types';

/** Fenêtre de regroupement des passages : un va-et-vient plus court ne compte pas. */
export const RENEW_COOLDOWN_MS = 300;

/** Palet `index` passé du camp `from` au camp `to` depuis le dernier étiquetage. */
export interface Crossing {
  index: number;
  from: Player;
  to: Player;
}

export interface CrossingDetector {
  /** Mémorise les camps étiquetés (au départ, après Rejouer). */
  reset(camps: readonly Player[], nowMs: number): void;
  /**
   * Palets ayant changé de camp, à traiter une fois : les camps diffèrent de ceux du dernier
   * étiquetage et sont restés identiques entre eux depuis au moins la fenêtre (anti-rebond : on
   * réagit sur le front stable, jamais en plein va-et-vient). Un aller-retour qui revient aux
   * camps étiquetés ne renvoie rien ; un passage net est renvoyé une seule fois. Vide sinon.
   */
  update(camps: readonly Player[], nowMs: number): Crossing[];
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
      if (sameCamps(current, labelled)) return [];
      if (nowMs - since < cooldownMs) return [];
      const crossings: Crossing[] = [];
      current.forEach((to, index) => {
        const from = labelled[index];
        if (from !== undefined && from !== to) crossings.push({ index, from, to });
      });
      labelled = [...current];
      return crossings;
    },
  };
}
