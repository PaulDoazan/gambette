import type { GameContext, GameInstance, GameModule } from './types';

export interface StandaloneOptions {
  container?: HTMLElement;
}

export function runStandalone(
  module: GameModule,
  opts: StandaloneOptions = {},
): Promise<GameInstance> {
  const el = opts.container ?? document.body;
  const ctx: GameContext = {
    locale: 'fr',
    onScore: (score) => console.log('[standalone] score', score),
    onGameOver: (result) => console.log('[standalone] game over', result),
    onExit: () => console.log('[standalone] exit'),
  };
  return Promise.resolve(module.mount(el, ctx));
}
