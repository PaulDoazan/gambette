import { createGameRegistry } from '@gambette/game-sdk';
import { rabbitMath } from '@gambette/game-rabbit-math';

export const registry = createGameRegistry([rabbitMath]);
