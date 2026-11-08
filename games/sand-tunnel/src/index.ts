import type { GameModule } from '@gambette/game-sdk';
import { mountSandTunnel } from './mount';

export const sandTunnel: GameModule = {
  meta: {
    key: 'sand-tunnel',
    name: 'Sand Tunnel',
    description: 'Retrouve le calcul et creuse le chemin du poisson jusqu’à la mer !',
    players: 'solo',
    instructions: 'Trace le bon chemin pour retrouver le calcul !',
  },
  mount: mountSandTunnel,
};
