import { describe, it, expect, vi } from 'vitest';
import type { GameModule } from '../src/types';

const sampleModule: GameModule = {
  meta: { key: 'sample', name: 'Sample', description: 'desc', instructions: 'do the thing' },
  mount: () => ({ unmount: vi.fn() }),
};

describe('GameModule contract', () => {
  it('expose une meta avec les champs requis', () => {
    expect(sampleModule.meta.key).toBe('sample');
    expect(typeof sampleModule.mount).toBe('function');
  });
});
