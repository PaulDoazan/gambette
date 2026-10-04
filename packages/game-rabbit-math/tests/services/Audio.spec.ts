import { describe, it, expect, vi } from 'vitest';
import { createAudio, type SoundId } from '../../src/services/Audio';

const fakeAudio = () => {
  const play = vi.fn();
  const pause = vi.fn();
  // Vitest 4's vi.fn with arrow impl is not constructable; use a regular
  // function so the production code can call `new deps.AudioCtor(...)`.
  function Ctor(this: unknown) {
    return { play, pause, currentTime: 0, loop: false };
  }
  const ctor = vi.fn(Ctor as unknown as () => unknown);
  return { play, pause, ctor };
};

describe('Audio sfx', () => {
  it('plays a sfx', () => {
    const f = fakeAudio();
    const a = createAudio({ AudioCtor: f.ctor as unknown as typeof Audio });
    a.playSfx('shot' as SoundId);
    expect(f.play).toHaveBeenCalledTimes(1);
  });
});

describe('Audio music', () => {
  it('startMusic plays once and stopMusic pauses', () => {
    const f = fakeAudio();
    const a = createAudio({ AudioCtor: f.ctor as unknown as typeof Audio });
    a.startMusic();
    a.stopMusic();
    expect(f.play).toHaveBeenCalledTimes(1);
    expect(f.pause).toHaveBeenCalledTimes(1);
  });
});
