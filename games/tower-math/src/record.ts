export const RECORD_KEY = 'gambette.tower-math.record';

/** Meilleur score sur cet appareil ; absent, invalide ou stockage indisponible → 0. */
export function loadRecord(): number {
  try {
    const n = Number(localStorage.getItem(RECORD_KEY));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveRecord(n: number): void {
  try {
    localStorage.setItem(RECORD_KEY, String(n));
  } catch {
    // Stockage indisponible (navigation privée, quota) : le record vit le temps de la session.
  }
}
