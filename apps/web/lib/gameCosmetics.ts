// Habillage purement cosmétique des jeux pour les menus (vignette, couleurs,
// emblème), dérivé par clé de jeu sans toucher au SDK. `color` réfère les tokens
// du thème Vuetify.
import mathRiverThumb from '../assets/thumbnails/math-river.svg';
import passeTrappeThumb from '../assets/thumbnails/passe-trappe.svg';
import rabbitMathThumb from '../assets/thumbnails/rabbit-math.svg';
import towerMathThumb from '../assets/thumbnails/tower-math.svg';

export interface GameCosmetic {
  /** Token de couleur du thème Vuetify (primary/secondary/tertiary/warning). */
  color: string;
  /** Icône MDI servant d'emblème. */
  icon: string;
  /** Grande vignette carrée de la carte du menu (URL). */
  thumbnail?: string;
  /** Couleur du bandeau du titre posé sur la vignette. */
  band: string;
}

const BY_KEY: Record<string, GameCosmetic> = {
  'rabbit-math': {
    color: 'secondary',
    icon: 'mdi-rabbit',
    thumbnail: rabbitMathThumb,
    band: '#2e7d32',
  },
  'passe-trappe': {
    color: 'tertiary',
    icon: 'mdi-swap-vertical',
    thumbnail: passeTrappeThumb,
    band: '#8a5a2b',
  },
  'tower-math': {
    color: 'warning',
    icon: 'mdi-cube-outline',
    thumbnail: towerMathThumb,
    band: '#6a45d6',
  },
  'math-river': {
    color: 'secondary',
    icon: 'mdi-fish',
    thumbnail: mathRiverThumb,
    band: '#1f6fa8',
  },
};

// Pour tout jeu sans habillage dédié : rotation déterministe sur la charte.
const ROTATION: GameCosmetic[] = [
  { color: 'tertiary', icon: 'mdi-puzzle', band: '#00274b' },
  { color: 'warning', icon: 'mdi-calculator-variant', band: '#00274b' },
  { color: 'secondary', icon: 'mdi-gamepad-variant', band: '#00274b' },
];

const FALLBACK: GameCosmetic = ROTATION[0]!;

export function gameCosmetic(key: string, index = 0): GameCosmetic {
  return BY_KEY[key] ?? ROTATION[index % ROTATION.length] ?? FALLBACK;
}
