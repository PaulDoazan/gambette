import { describe, it, expect, vi } from 'vitest';
import type { Container, FederatedPointerEvent, Text } from 'pixi.js';
import { createVictoryScene } from '../../src/scenes/VictoryScene';

const texts = (c: Container): Text[] =>
  c.children.flatMap((ch) => ('text' in ch ? [ch as Text] : texts(ch as Container)));
const byLabel = (c: Container, label: string): Container =>
  c.getChildByLabel(label, true) as Container;

describe('VictoryScene', () => {
  it('annonce le vainqueur deux fois, dont une retournée pour le joueur d’en haut', () => {
    const s = createVictoryScene({ winner: 'A', onReplay: vi.fn(), onQuit: vi.fn() });
    const msgs = texts(s.view).filter((t) => t.text.includes('gagne'));
    expect(msgs).toHaveLength(2);
    expect(msgs.every((t) => t.text === 'Joueur du bas gagne !')).toBe(true);
    expect(msgs.some((t) => Math.abs(t.rotation - Math.PI) < 1e-6)).toBe(true);
    s.destroy();
  });

  it('Rejouer et Quitter appellent leurs callbacks', () => {
    const onReplay = vi.fn();
    const onQuit = vi.fn();
    const s = createVictoryScene({ winner: 'B', onReplay, onQuit });
    expect(texts(s.view).some((t) => t.text === 'Joueur du haut gagne !')).toBe(true);
    byLabel(s.view, 'replay').emit('pointertap', {} as FederatedPointerEvent);
    byLabel(s.view, 'quit').emit('pointertap', {} as FederatedPointerEvent);
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onQuit).toHaveBeenCalledTimes(1);
    s.destroy();
  });
});
