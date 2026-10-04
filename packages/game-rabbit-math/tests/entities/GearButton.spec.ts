import { describe, it, expect, vi } from 'vitest';
import type { FederatedPointerEvent } from 'pixi.js';
import { createGearButton } from '../../src/entities/GearButton';
import { GEAR_POS } from '../../src/config/dimensions';

describe('GearButton tap', () => {
  it("invokes the provided onTap handler when emit('pointerup') fires", () => {
    const handler = vi.fn();
    const btn = createGearButton({ onTap: handler });
    btn.view.emit('pointerup', {} as FederatedPointerEvent);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('GearButton position', () => {
  it('matches the configured GEAR_POS', () => {
    const btn = createGearButton({ onTap: () => {} });
    expect(btn.view.position).toMatchObject({ x: GEAR_POS.x, y: GEAR_POS.y });
  });
});
