import type { GameModule } from '@gambette/game-sdk';
import { mountPasseTrappe } from './mount';

export const passeTrappe: GameModule = {
  meta: {
    key: 'passe-trappe',
    name: 'Passe-trappe',
    description: 'Le jeu d’adresse en bois, avec du calcul, à deux sur le même téléphone.',
    instructions:
      'Posez le téléphone entre vous, chacun face à son camp. Résolvez le calcul de votre camp : ' +
      'seul le palet qui porte la bonne réponse part avec l’élastique ! Plaquez-le contre votre ' +
      'élastique, tirez puis relâchez pour le faire passer par le trou. Le premier qui n’a plus ' +
      'aucun palet dans son camp a gagné.',
  },
  mount: mountPasseTrappe,
};
