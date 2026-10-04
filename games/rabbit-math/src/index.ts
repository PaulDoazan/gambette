import type { GameModule } from '@gambette/game-sdk';
import { mountRabbitMath } from './mount';

export const rabbitMath: GameModule = {
  meta: {
    key: 'rabbit-math',
    name: 'Rabbit Math',
    description: 'Lance des carottes au lapin qui porte la bonne réponse.',
    instructions:
      'Tire sur l’élastique et vise le lapin qui affiche le résultat du calcul. ' +
      'Le bouton engrenage permet de choisir les calculs à travailler.',
  },
  mount: mountRabbitMath,
};
