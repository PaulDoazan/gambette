import { runStandalone } from '@gambette/game-sdk';
import { passeTrappe } from './index';

const root = document.getElementById('game-root');
if (!root) throw new Error('Missing #game-root');
void runStandalone(passeTrappe, { container: root });
