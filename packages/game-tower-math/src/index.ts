import type { GameModule } from '@gambette/game-sdk';
import { mountTowerMath } from './game';

export const towerMath: GameModule = {
  meta: {
    key: 'tower-math',
    name: 'Tour de calcul',
    description: 'Empile les blocs en trouvant le bon résultat.',
    instructions:
      'Clique le bon résultat parmi les 5, au bon moment, pour poser le bloc. ' +
      'Une mauvaise réponse termine la partie. Le bouton engrenage permet de choisir les calculs.',
  },
  mount: mountTowerMath,
};
