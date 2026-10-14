import { createGameRegistry } from '@gambette/game-sdk';
import { rabbitMath } from '@gambette/game-rabbit-math';
import { towerMath } from '@gambette/game-tower-math';

export const registry = createGameRegistry([rabbitMath, towerMath]);
