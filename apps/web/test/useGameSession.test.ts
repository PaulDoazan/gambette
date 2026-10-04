import { describe, it, expect } from 'vitest';
import { useGameSession } from '../composables/useGameSession';

describe('useGameSession', () => {
  it('alterne briefing ↔ playing et partage l’état', () => {
    const a = useGameSession();
    const b = useGameSession();
    a.backToBriefing();
    expect(b.state.phase).toBe('briefing');
    a.startPlaying();
    expect(b.state.phase).toBe('playing');
    b.backToBriefing();
    expect(a.state.phase).toBe('briefing');
  });
});
