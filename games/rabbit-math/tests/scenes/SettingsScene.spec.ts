import { describe, it, expect, vi } from 'vitest';
import type { Container, FederatedPointerEvent } from 'pixi.js';
import { createSettingsScene } from '../../src/scenes/SettingsScene';
import { DEFAULT_SETTINGS, settingsChanged } from '../../src/services/Settings';

const tap = (view: Container, label: string) =>
  (view.getChildByLabel(label, true) as Container).emit('pointertap', {} as FederatedPointerEvent);
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('SettingsScene', () => {
  it('− / + bornés à [4, 8] lapins, Fermer renvoie les réglages', () => {
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { ...DEFAULT_SETTINGS, rabbitsCount: 4 },
      onOpenCalcsPicker: vi.fn(),
      onClose,
    });
    tap(s.view, 'minus');
    expect(s.rabbitsCount()).toBe(4);
    for (let i = 0; i < 6; i++) tap(s.view, 'plus');
    expect(s.rabbitsCount()).toBe(8);
    tap(s.view, 'minus');
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ rabbitsCount: 7 }));
    s.destroy();
  });

  it('l’interrupteur bascule le mode tap', () => {
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { ...DEFAULT_SETTINGS, tapMode: false },
      onOpenCalcsPicker: vi.fn(),
      onClose,
    });
    tap(s.view, 'tapMode');
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ tapMode: true }));
    s.destroy();
  });

  it('« Choisir les calculs » ouvre le sélecteur et garde la nouvelle sélection', async () => {
    const picked = [{ a: 2, b: 3, op: 'mul' as const }];
    const onClose = vi.fn();
    const onOpenCalcsPicker = vi.fn(async () => picked);
    const s = createSettingsScene({ initial: DEFAULT_SETTINGS, onOpenCalcsPicker, onClose });
    tap(s.view, 'calcs');
    await flush();
    expect(onOpenCalcsPicker).toHaveBeenCalledWith(DEFAULT_SETTINGS.selectedPairs);
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, selectedPairs: picked });
    s.destroy();
  });

  it('un sélecteur refermé après la destruction du panneau est sans effet', async () => {
    let resolve!: (p: never[]) => void;
    const s = createSettingsScene({
      initial: DEFAULT_SETTINGS,
      onOpenCalcsPicker: () => new Promise((r) => (resolve = r)),
      onClose: vi.fn(),
    });
    tap(s.view, 'calcs');
    s.destroy();
    resolve([]);
    await flush();
  });
});

describe('settingsChanged', () => {
  const a = DEFAULT_SETTINGS;
  it('vrai si les calculs, le nombre de lapins ou le mode tap changent', () => {
    expect(settingsChanged(a, { ...a, rabbitsCount: 6 })).toBe(true);
    expect(settingsChanged(a, { ...a, selectedPairs: a.selectedPairs.slice(0, 5) })).toBe(true);
    expect(settingsChanged(a, { ...a, tapMode: !a.tapMode })).toBe(true);
  });

  it('faux pour les mêmes calculs dans un autre ordre', () => {
    expect(settingsChanged(a, { ...a, selectedPairs: [...a.selectedPairs].reverse() })).toBe(false);
  });

  it('distingue l’opération : 3 × 4 n’est pas 3 + 4', () => {
    const mul = { ...a, selectedPairs: [{ a: 3, b: 4, op: 'mul' as const }] };
    expect(settingsChanged(mul, { ...a, selectedPairs: [{ a: 3, b: 4, op: 'add' }] })).toBe(true);
  });
});
