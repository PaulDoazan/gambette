import { describe, it, expect, vi } from 'vitest';
import type { Container, FederatedPointerEvent } from 'pixi.js';
import type { Pair } from '@gambette/math-sdk';
import { createSettingsScene } from '../../src/scenes/SettingsScene';

const tap = (view: Container, label: string) =>
  (view.getChildByLabel(label, true) as Container).emit('pointertap', {} as FederatedPointerEvent);
const shown = (view: Container, label: string) =>
  (view.getChildByLabel(label, true) as Container).visible;
const flush = () => new Promise((r) => setTimeout(r, 0));

const P: Pair[] = [{ a: 6, b: 8, op: 'mul' }];
const Q: Pair[] = [{ a: 2, b: 3, op: 'add' }];
const R: Pair[] = [{ a: 9, b: 4, op: 'sub' }];

describe('SettingsScene', () => {
  it('mêmes calculs (défaut) : un seul bouton, qui règle les deux joueurs', async () => {
    const onClose = vi.fn();
    const onOpenCalcsPicker = vi.fn(async () => Q);
    const s = createSettingsScene({
      initial: { calcs: { same: true, A: P, B: R } },
      onOpenCalcsPicker,
      onClose,
    });
    expect(shown(s.view, 'calcs')).toBe(true);
    expect(shown(s.view, 'calcsA')).toBe(false);
    expect(shown(s.view, 'calcsB')).toBe(false);
    tap(s.view, 'calcs');
    await flush();
    expect(onOpenCalcsPicker).toHaveBeenCalledWith(P, undefined);
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ calcs: { same: true, A: Q, B: R } });
    s.destroy();
  });

  it('interrupteur coupé : un bouton par joueur, chacun avec son titre et sa sélection', async () => {
    const onClose = vi.fn();
    const onOpenCalcsPicker = vi.fn(async (current: Pair[]) => (current === P ? Q : P));
    const s = createSettingsScene({
      initial: { calcs: { same: true, A: P, B: R } },
      onOpenCalcsPicker,
      onClose,
    });
    tap(s.view, 'same');
    expect(shown(s.view, 'calcs')).toBe(false);
    expect(shown(s.view, 'calcsA')).toBe(true);
    expect(shown(s.view, 'calcsB')).toBe(true);
    tap(s.view, 'calcsA');
    await flush();
    expect(onOpenCalcsPicker).toHaveBeenLastCalledWith(P, 'Calculs du joueur du bas');
    tap(s.view, 'calcsB');
    await flush();
    expect(onOpenCalcsPicker).toHaveBeenLastCalledWith(R, 'Calculs du joueur du haut');
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ calcs: { same: false, A: Q, B: P } });
    s.destroy();
  });

  it('s’ouvre interrupteur coupé si les calculs étaient séparés, et se réactive', () => {
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { calcs: { same: false, A: P, B: R } },
      onOpenCalcsPicker: vi.fn(),
      onClose,
    });
    expect(shown(s.view, 'calcsB')).toBe(true);
    tap(s.view, 'same');
    expect(shown(s.view, 'calcs')).toBe(true);
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ calcs: { same: true, A: P, B: R } });
    s.destroy();
  });
});
