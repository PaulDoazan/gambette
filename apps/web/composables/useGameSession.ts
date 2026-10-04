import { reactive } from 'vue';

export type GamePhase = 'briefing' | 'playing';

const state = reactive<{ phase: GamePhase }>({ phase: 'briefing' });

export interface GameSessionApi {
  state: { readonly phase: GamePhase };
  startPlaying: () => void;
  backToBriefing: () => void;
}

export function useGameSession(): GameSessionApi {
  return {
    state,
    startPlaying: () => {
      state.phase = 'playing';
    },
    backToBriefing: () => {
      state.phase = 'briefing';
    },
  };
}
