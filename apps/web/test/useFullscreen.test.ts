import { describe, it, expect } from 'vitest';
import { shouldShowFullscreenToggle } from '../composables/useFullscreen';

describe('shouldShowFullscreenToggle', () => {
  it('visible sur mobile, API dispo, hors partie', () => {
    expect(shouldShowFullscreenToggle(true, true, 'briefing')).toBe(true);
    expect(shouldShowFullscreenToggle(true, true, 'result')).toBe(true);
  });

  it('masqué pendant la partie (le jeu a son propre bouton)', () => {
    expect(shouldShowFullscreenToggle(true, true, 'playing')).toBe(false);
  });

  it('masqué sur desktop ou si l’API est absente', () => {
    expect(shouldShowFullscreenToggle(true, false, 'briefing')).toBe(false);
    expect(shouldShowFullscreenToggle(false, true, 'briefing')).toBe(false);
  });
});
