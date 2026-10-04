import { runStandalone } from '@gambette/game-sdk';
import { rabbitMath } from './index';

const root = document.getElementById('game-root');
if (!root) throw new Error('Missing #game-root');
void runStandalone(rabbitMath, { container: root }).then(() => {
  document.getElementById('loader')?.remove();
});
