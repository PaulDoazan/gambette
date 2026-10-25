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
      initial: { pucksPerPlayer: 5, calcs: { same: true, A: [], B: [] } },
      onOpenCalcsPicker: vi.fn(),
      onClose,
    });
    tap(s.view, 'minus');
    expect(s.pucksPerPlayer()).toBe(5);
    for (let i = 0; i < 8; i++) tap(s.view, 'plus');
    expect(s.pucksPerPlayer()).toBe(10);
    tap(s.view, 'minus');
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({
      pucksPerPlayer: 9,
      calcs: { same: true, A: [], B: [] },
    });
    s.destroy();
  });

  it('« Choisir les calculs » ouvre le sélecteur et garde la nouvelle sélection', async () => {
    const picked = [{ a: 2, b: 3, op: 'mul' as const }];
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { pucksPerPlayer: 6, calcs: { same: true, A: [], B: [] } },
      onOpenCalcsPicker: vi.fn(async () => picked),
      onClose,
    });
    tap(s.view, 'calcs');
    await flush();
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({
      pucksPerPlayer: 6,
      calcs: { same: true, A: picked, B: [] },
    });
    s.destroy();
  });

  it('interrupteur coupé : un bouton par joueur, chacun avec son titre et sa sélection', async () => {
    const P = [{ a: 6, b: 8, op: 'mul' as const }];
    const Q = [{ a: 2, b: 3, op: 'add' as const }];
    const R = [{ a: 9, b: 4, op: 'sub' as const }];
    const shown = (label: string) => (s.view.getChildByLabel(label, true) as Container).visible;
    const onClose = vi.fn();
    const onOpenCalcsPicker = vi.fn(async (current: unknown) => (current === P ? Q : P));
    const s = createSettingsScene({
      initial: { pucksPerPlayer: 5, calcs: { same: true, A: P, B: R } },
      onOpenCalcsPicker,
      onClose,
    });
    expect(shown('calcs')).toBe(true);
    expect(shown('calcsA')).toBe(false);
    tap(s.view, 'same');
    expect(shown('calcs')).toBe(false);
    expect(shown('calcsA')).toBe(true);
    expect(shown('calcsB')).toBe(true);
    tap(s.view, 'calcsA');
    await flush();
    expect(onOpenCalcsPicker).toHaveBeenLastCalledWith(P, 'Calculs du joueur du bas');
    tap(s.view, 'calcsB');
    await flush();
    expect(onOpenCalcsPicker).toHaveBeenLastCalledWith(R, 'Calculs du joueur du haut');
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({
      pucksPerPlayer: 5,
      calcs: { same: false, A: Q, B: P },
    });
    s.destroy();
  });
});
