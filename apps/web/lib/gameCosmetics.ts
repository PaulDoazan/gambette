// Habillage purement cosmétique des jeux pour les menus (couleur + emblème de
// carte), dérivé par clé de jeu sans toucher au SDK. Les couleurs réfèrent les
// tokens du thème Vuetify.

export interface GameCosmetic {
  /** Token de couleur du thème Vuetify (primary/secondary/tertiary/warning). */
  color: string;
  /** Icône MDI servant d'emblème. */
  icon: string;
  /** Caractéristiques mises en avant sur la carte (pastilles). */
  traits: string[];
}

const BY_KEY: Record<string, GameCosmetic> = {
  'rabbit-math': {
    color: 'secondary',
    icon: 'mdi-rabbit',
    traits: ['calcul', 'adresse'],
  },
  'passe-trappe': {
    color: 'tertiary',
    icon: 'mdi-swap-vertical',
    traits: ['adresse', '2 joueurs'],
  },
};

// Pour tout jeu sans habillage dédié : rotation déterministe sur la charte.
const ROTATION: GameCosmetic[] = [
  { color: 'tertiary', icon: 'mdi-puzzle', traits: [] },
  { color: 'warning', icon: 'mdi-calculator-variant', traits: [] },
  { color: 'secondary', icon: 'mdi-gamepad-variant', traits: [] },
];

const FALLBACK: GameCosmetic = ROTATION[0]!;

export function gameCosmetic(key: string, index = 0): GameCosmetic {
  return BY_KEY[key] ?? ROTATION[index % ROTATION.length] ?? FALLBACK;
}
