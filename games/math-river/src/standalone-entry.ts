import { runStandalone } from '@gambette/game-sdk';
import { mathRiver } from './index';

const root = document.getElementById('game-root');
if (!root) throw new Error('Missing #game-root');
void runStandalone(mathRiver, { container: root });
