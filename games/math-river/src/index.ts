import type { GameModule } from '@gambette/game-sdk';
import { mountMathRiver } from './mount';

export const mathRiver: GameModule = {
  meta: {
    key: 'math-river',
    name: 'Math River',
    description: 'Un jeu à deux, en équipe : de trou en trou, menez le poisson jusqu’à la mer !',
    players: 'coop',
    instructions:
      'Posez le téléphone entre vous, chacun face à ses seaux. Résolvez votre calcul et tirez ' +
      'le seau qui porte la bonne réponse vers vous, puis relâchez pour lancer l’eau dans le ' +
      'trou. Attention : un mauvais seau lance du sable, qui fait baisser l’eau ! L’eau ' +
      's’infiltre aussi dans le sable, alors ' +
      'remplissez vite, à deux : quand elle atteint le canal, le poisson file vers un trou plus ' +
      'grand. Au bout du troisième, c’est la mer !',
  },
  mount: mountMathRiver,
};
