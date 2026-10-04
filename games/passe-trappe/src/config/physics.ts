/** Vitesse de lancement (px/s) par pixel d'étirement de l'élastique. */
export const LAUNCH_POWER = 18;
/** En dessous de cet étirement (px), relâcher ne lance pas le palet. */
export const MIN_STRETCH = 6;

/** Échelle planck : pixels par mètre. */
export const PX_PER_M = 50;
/** Pas de simulation fixe et nombre maximal de sous-pas par frame. */
export const STEP_S = 1 / 60;
export const MAX_SUBSTEPS = 5;
export const PUCK_DENSITY = 1;
export const PUCK_FRICTION = 0.05;
/** Restitution palet ↔ palet. */
export const PUCK_RESTITUTION = 0.8;
/** Restitution palet ↔ mur / cloison / élastique (imposée au contact, planck prenant sinon le max). */
export const WALL_RESTITUTION = 0.6;
/** Frottement du plateau (amortissement linéaire planck, 1/s). */
export const PUCK_LINEAR_DAMPING = 1.2;
/** Force max du MouseJoint de glisser, par kg de palet. */
export const DRAG_MAX_FORCE_PER_KG = 2000;
/** Vitesse max (px/s) d'un palet lâché sans lancer élastique : un geste de la main ne doit pas égaler l'élastique. */
export const DROP_MAX_SPEED = 300;
/** Vitesse max (px/s) d'un palet poussé par un palet tenu : on peut le déplacer, pas l'envoyer à travers le trou. */
export const PUSHED_MAX_SPEED = 120;

export const CATEGORY = { PUCK: 0x1, WALL: 0x2, ELASTIC: 0x4 } as const;
/** Vibration d'un mauvais palet relâché : durée (ms) et amplitude (px), purement visuelle. */
export const VIBRATE_MS = 400;
export const VIBRATE_AMPLITUDE = 6;
/** Vitesse max (px/s) d'un mauvais palet relâché : il bouge un peu, sans atteindre le trou. */
export const WRONG_LAUNCH_SPEED = 120;
