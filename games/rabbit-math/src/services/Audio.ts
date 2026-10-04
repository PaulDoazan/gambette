export type SoundId = 'shot' | 'hit_correct' | 'hit_wrong' | 'ground' | 'session_done';

export interface AudioApi {
  playSfx(id: SoundId): void;
  startMusic(): void;
  stopMusic(): void;
}

export interface AudioDeps {
  AudioCtor: typeof Audio;
  sfxSrc?: Record<SoundId, string> | undefined;
  musicSrc?: string | undefined;
}

const BASE = import.meta.env.BASE_URL;

const DEFAULT_SRC: Record<SoundId, string> = {
  shot: `${BASE}assets/sounds/shot.mp3`,
  hit_correct: `${BASE}assets/sounds/hit_correct.mp3`,
  hit_wrong: `${BASE}assets/sounds/hit_wrong.mp3`,
  ground: `${BASE}assets/sounds/ground.mp3`,
  session_done: `${BASE}assets/sounds/session_done.mp3`,
};

interface AudioState {
  music: HTMLAudioElement | null;
}

const startMusicImpl = (deps: AudioDeps, state: AudioState): void => {
  if (!state.music) {
    state.music = new deps.AudioCtor(deps.musicSrc ?? `${BASE}assets/sounds/music.mp3`);
    state.music.loop = true;
  }
  void state.music.play();
};

export function createAudio(deps: AudioDeps): AudioApi {
  const sfx = deps.sfxSrc ?? DEFAULT_SRC;
  const state: AudioState = { music: null };
  return {
    playSfx: (id) => {
      void new deps.AudioCtor(sfx[id]).play();
    },
    startMusic: () => startMusicImpl(deps, state),
    stopMusic: () => state.music?.pause(),
  };
}
