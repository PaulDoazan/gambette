import { describe, it, expect, vi } from 'vitest';
import type { Container, FederatedPointerEvent } from 'pixi.js';
import type { Pair } from '@gambette/math-sdk';
import { createSettingsScene } from '../../src/scenes/SettingsScene';

const tap = (view: Container, label: string) =>
  (view.getChildByLabel(label, true) as Container).emit('pointertap', {} as FederatedPointerEvent);
const flush = () => new Promise((r) => setTimeout(r, 0));

const P: Pair[] = [{ a: 6, b: 8, op: 'mul' }];
const Q: Pair[] = [{ a: 2, b: 3, op: 'add' }];

describe('SettingsScene', () => {
  it('choisir les calculs, puis fermer rend la nouvelle sélection', async () => {
    const onClose = vi.fn();
    const onOpenCalcsPicker = vi.fn(async () => Q);
    const s = createSettingsScene({ initial: { calcs: P }, onOpenCalcsPicker, onClose });
    tap(s.view, 'calcs');
    await flush();
    expect(onOpenCalcsPicker).toHaveBeenCalledWith(P);
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ calcs: Q });
    s.destroy();
  });

  it('sélecteur annulé : la sélection reste', async () => {
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { calcs: P },
      onOpenCalcsPicker: () => Promise.reject(new Error('annulé')),
      onClose,
    });
    tap(s.view, 'calcs');
    await flush();
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ calcs: P });
    s.destroy();
  });
});
