import type { GameModule } from '@gambette/game-sdk';
import { mountMathRiver } from './mount';

export const mathRiver: GameModule = {
  meta: {
    key: 'math-river',
    name: 'Math River',
    description: 'Un jeu à deux, en équipe : remplissez le trou pour libérer le poisson !',
    instructions:
      'Posez le téléphone entre vous, chacun face à ses seaux. Résolvez votre calcul et tirez ' +
      'le seau qui porte la bonne réponse vers vous, puis relâchez pour lancer l’eau dans le ' +
      'trou : un mauvais seau se renverse sur place ! L’eau s’infiltre dans le sable, alors ' +
      'remplissez vite, à deux : quand elle atteint le canal, le poisson est sauvé.',
  },
  mount: mountMathRiver,
};
