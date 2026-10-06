import { describe, it, expect, vi } from 'vitest';
import { createSlingshotInput } from '../../src/systems/SlingshotInput';

const fakeSlingshot = () => {
  const aimAt = vi.fn();
  const releaseVelocity = vi.fn(() => ({ x: 5, y: -3 }));
  const reset = vi.fn();
  return { aimAt, releaseVelocity, reset };
};

describe('SlingshotInput drag', () => {
  it('pointerdown -> pointermove -> pointerup releases with the latest aim', () => {
    const slingshot = fakeSlingshot();
    const onRelease = vi.fn();
    const input = createSlingshotInput({ slingshot, onRelease, onAim: () => {} });
    input.handlePointerDown({ x: 100, y: 100 });
    input.handlePointerMove({ x: 90, y: 110 });
    input.handlePointerMove({ x: 80, y: 120 });
    input.handlePointerUp();
    expect(slingshot.aimAt).toHaveBeenCalledTimes(2);
    expect(onRelease).toHaveBeenCalledWith({ x: 5, y: -3 });
  });
});

describe('SlingshotInput guard', () => {
  it('pointerup without a prior pointerdown is ignored', () => {
    const slingshot = fakeSlingshot();
    const onRelease = vi.fn();
    const input = createSlingshotInput({ slingshot, onRelease, onAim: () => {} });
    input.handlePointerUp();
    expect(onRelease).not.toHaveBeenCalled();
  });
});
