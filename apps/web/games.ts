import { createGameRegistry } from '@gambette/game-sdk';
import { rabbitMath } from '@gambette/game-rabbit-math';
import { passeTrappe } from '@gambette/game-passe-trappe';

export const registry = createGameRegistry([rabbitMath, passeTrappe]);
