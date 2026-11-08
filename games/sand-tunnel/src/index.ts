import type { GameModule } from '@gambette/game-sdk';
import { mountSandTunnel } from './mount';

export const sandTunnel: GameModule = {
  meta: {
    key: 'sand-tunnel',
    name: 'Sand Tunnel',
    description: 'Retrouve le calcul et creuse le chemin du poisson jusqu’à la mer !',
    players: 'solo',
    instructions:
      'Un résultat s’affiche en haut. Pars de la mare du poisson et glisse le doigt sur un ' +
      'nombre, un opérateur, puis un autre nombre, en suivant les sillons : le sable se creuse. ' +
      'Lève le doigt : si le calcul donne le résultat, l’eau s’engouffre dans la galerie et le ' +
      'poisson file vers le réseau suivant. Sinon, le sable s’effondre et l’eau ne passe pas : ' +
      'essaie un autre chemin ! Au bout du troisième réseau, c’est la mer.',
  },
  mount: mountSandTunnel,
};
