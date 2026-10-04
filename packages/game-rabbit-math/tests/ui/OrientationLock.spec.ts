import { describe, it, expect, vi } from 'vitest';
import { installOrientationLock } from '../../src/ui/OrientationLock';

describe('installOrientationLock', () => {
  it('ajoute un overlay puis le retire avec ses écouteurs au dispose', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const parent = document.createElement('div');
    const dispose = installOrientationLock(parent);
    expect(parent.children).toHaveLength(1);
    dispose();
    expect(parent.children).toHaveLength(0);
    for (const type of ['resize', 'orientationchange']) {
      const handler = add.mock.calls.find((c) => c[0] === type)![1];
      expect(remove).toHaveBeenCalledWith(type, handler);
    }
    add.mockRestore();
    remove.mockRestore();
  });
});
