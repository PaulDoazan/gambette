import { createGameRegistry } from '@gambette/game-sdk';
import { rabbitMath } from '@gambette/game-rabbit-math';
import { passeTrappe } from '@gambette/game-passe-trappe';
import { towerMath } from '@gambette/game-tower-math';
import { mathRiver } from '@gambette/game-math-river';

export const registry = createGameRegistry([rabbitMath, passeTrappe, towerMath, mathRiver]);
