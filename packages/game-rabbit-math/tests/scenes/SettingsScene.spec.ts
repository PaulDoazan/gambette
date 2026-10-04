import { describe, it, expect, vi } from 'vitest';
import { createSettingsScene } from '../../src/scenes/SettingsScene';
import { cycle, sessionImpactingChanged } from '../../src/scenes/SettingsPanel';
import { DEFAULT_SETTINGS } from '../../src/services/Settings';
import type { Pair } from '@gambette/math-sdk';

const stubDeps = {
  onOpenCalcsPicker: async () => DEFAULT_SETTINGS.selectedPairs,
};

const makeScene = (overrides: Partial<Parameters<typeof createSettingsScene>[0]> = {}) =>
  createSettingsScene({
    initial: DEFAULT_SETTINGS,
    onChange: () => {},
    onClose: () => {},
    ...stubDeps,
    ...overrides,
  });

describe('SettingsScene setRabbitsCount emits onChange', () => {
  it('emits onChange with the patched settings', () => {
    const onChange = vi.fn();
    const scene = makeScene({ onChange });
    scene.setRabbitsCount(6);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ rabbitsCount: 6 }));
  });
});

describe('SettingsScene setSelectedPairs emits onChange', () => {
  it('emits onChange with the new pairs', () => {
    const onChange = vi.fn();
    const scene = makeScene({ onChange });
    const pairs: Pair[] = [
      { a: 2, b: 3, op: 'mul' },
      { a: 5, b: 6, op: 'mul' },
    ];
    scene.setSelectedPairs(pairs);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ selectedPairs: pairs }));
  });
});

describe('SettingsScene setTapMode emits onChange', () => {
  it('emits onChange with the new tapMode', () => {
    const onChange = vi.fn();
    const scene = makeScene({ onChange });
    scene.setTapMode(true);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tapMode: true }));
  });
});

describe('SettingsScene close', () => {
  it('confirmCloseWith fires onClose with latest settings and restartRequested', () => {
    const onClose = vi.fn();
    const scene = makeScene({ onClose });
    scene.setRabbitsCount(7);
    scene.confirmCloseWith(true);
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ rabbitsCount: 7 }), true);
  });
});

describe('SettingsScene close without changes', () => {
  it('does NOT prompt for restart when nothing changed', () => {
    const onClose = vi.fn();
    const scene = makeScene({ onClose });
    scene.confirmCloseWith(false);
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining(DEFAULT_SETTINGS), false);
  });
});

describe('cycle', () => {
  it('returns the next element wrapping at the end', () => {
    expect(cycle(['a', 'b', 'c'], 'a')).toBe('b');
    expect(cycle(['a', 'b', 'c'], 'c')).toBe('a');
  });
});

describe('sessionImpactingChanged true cases', () => {
  it('returns true when selectedPairs, rabbitsCount, or tapMode changes', () => {
    const a = DEFAULT_SETTINGS;
    expect(sessionImpactingChanged(a, { ...a, rabbitsCount: 6 })).toBe(true);
    const fewer = a.selectedPairs.slice(0, 5);
    expect(sessionImpactingChanged(a, { ...a, selectedPairs: fewer })).toBe(true);
    expect(sessionImpactingChanged(a, { ...a, tapMode: !a.tapMode })).toBe(true);
  });
});

describe('sessionImpactingChanged false cases', () => {
  it('returns false when selectedPairs has same content in different order', () => {
    const a = DEFAULT_SETTINGS;
    const reversed = [...a.selectedPairs].reverse();
    expect(sessionImpactingChanged(a, { ...a, selectedPairs: reversed })).toBe(false);
  });
});
