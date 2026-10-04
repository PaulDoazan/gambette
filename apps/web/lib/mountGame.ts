import type { GameContext, GameInstance, GameModule } from '@gambette/game-sdk';

export interface RunningGame {
  stop(): void;
}

export interface StartGameCallbacks {
  onReady(): void;
  onError(e: unknown): void;
}

/**
 * Monte un jeu (mount synchrone ou asynchrone) et garantit son démontage :
 * si `stop()` arrive avant la fin du chargement, l'instance est démontée dès
 * qu'elle résout (aucun canvas orphelin quand on quitte pendant le chargement).
 */
export function startGame(
  module: GameModule,
  el: HTMLElement,
  ctx: GameContext,
  cb: StartGameCallbacks,
): RunningGame {
  let instance: GameInstance | null = null;
  let stopped = false;
  // mount est appelé de façon synchrone (le jeu démarre immédiatement) ; un throw
  // synchrone est converti en rejet pour passer par le même chemin onError.
  let pending: Promise<GameInstance>;
  try {
    pending = Promise.resolve(module.mount(el, ctx));
  } catch (e) {
    pending = Promise.reject(e);
  }
  pending.then(
    (inst) => {
      if (stopped) {
        inst.unmount();
        return;
      }
      instance = inst;
      cb.onReady();
    },
    (e: unknown) => {
      if (!stopped) cb.onError(e);
    },
  );
  return {
    stop(): void {
      stopped = true;
      instance?.unmount();
      instance = null;
    },
  };
}
