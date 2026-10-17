import { runStandalone } from '@gambette/game-sdk';
import { towerMath } from './index';

void runStandalone(towerMath, { container: document.getElementById('app')! });
