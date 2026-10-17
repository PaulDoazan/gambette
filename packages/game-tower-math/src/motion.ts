export interface BounceState {
  pos: number;
  forward: number; // sens de déplacement : +1 ou -1
}

/**
 * Déplacement aller-retour d'un pavé sur son axe, **indépendant du framerate**.
 * `speed` est en unités monde par seconde et `dt` en secondes : le pavé parcourt
 * donc la même distance par seconde quel que soit le nombre de frames affichées
 * (téléphone à 30 fps ou écran 144 Hz → même vitesse perçue, donc même
 * difficulté). Le sens s'inverse dès que la position dépasse ±bound (test avant
 * déplacement, comme l'animation d'origine) ; un léger dépassement au-delà du
 * bord est corrigé à la frame suivante.
 */
export function stepBounce(
  pos: number,
  forward: number,
  speed: number,
  bound: number,
  dt: number,
): BounceState {
  const f = pos > bound || pos < -bound ? -forward : forward;
  return { pos: pos + speed * f * dt, forward: f };
}
