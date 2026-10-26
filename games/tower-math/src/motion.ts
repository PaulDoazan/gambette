export interface BounceState {
  pos: number;
  forward: number; // sens de déplacement : +1 ou -1
}

/**
 * Déplacement aller-retour d'un pavé sur son axe, **indépendant du framerate**.
 * `speed` est en unités monde par seconde et `dt` en secondes : le pavé parcourt
 * donc la même distance par seconde quel que soit le nombre de frames affichées
 * (téléphone à 30 fps ou écran 144 Hz → même vitesse perçue, donc même
 * difficulté). Au-delà de ±bound (test avant déplacement, comme l'animation
 * d'origine), le sens est forcé vers l'intérieur, pas inversé : après une frame
 * lente, le dépassement peut être plus grand qu'un pas normal, et une simple
 * inversion renverrait le pavé dehors à la frame suivante (rebond sans fin au bord).
 */
export function stepBounce(
  pos: number,
  forward: number,
  speed: number,
  bound: number,
  dt: number,
): BounceState {
  const f = pos > bound ? -1 : pos < -bound ? 1 : forward;
  return { pos: pos + speed * f * dt, forward: f };
}
