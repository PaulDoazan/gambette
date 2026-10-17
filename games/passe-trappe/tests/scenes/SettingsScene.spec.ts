import { describe, it, expect, vi } from 'vitest';
import type { Container, FederatedPointerEvent } from 'pixi.js';
import { createSettingsScene } from '../../src/scenes/SettingsScene';

const tap = (view: Container, label: string) =>
  (view.getChildByLabel(label, true) as Container).emit('pointertap', {} as FederatedPointerEvent);
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('SettingsScene', () => {
  it('− / + bornés à [5, 10], Fermer renvoie les réglages', () => {
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { pucksPerPlayer: 5, selectedPairs: [] },
      onOpenCalcsPicker: vi.fn(),
      onClose,
    });
    tap(s.view, 'minus');
    expect(s.pucksPerPlayer()).toBe(5);
    for (let i = 0; i < 8; i++) tap(s.view, 'plus');
    expect(s.pucksPerPlayer()).toBe(10);
    tap(s.view, 'minus');
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ pucksPerPlayer: 9, selectedPairs: [] });
    s.destroy();
  });

  it('« Choisir les calculs » ouvre le sélecteur et garde la nouvelle sélection', async () => {
    const picked = [{ a: 2, b: 3, op: 'mul' as const }];
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { pucksPerPlayer: 6, selectedPairs: [] },
      onOpenCalcsPicker: vi.fn(async () => picked),
      onClose,
    });
    tap(s.view, 'calcs');
    await flush();
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ pucksPerPlayer: 6, selectedPairs: picked });
    s.destroy();
  });
});
