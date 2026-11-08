import { runStandalone } from '@gambette/game-sdk';
import { sandTunnel } from './index';

const root = document.getElementById('game-root');
if (!root) throw new Error('Missing #game-root');
void runStandalone(sandTunnel, { container: root });
