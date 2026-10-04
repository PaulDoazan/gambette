import { describe, it, expect, vi } from 'vitest';
import { createGameRegistry } from '../src/registry';
import type { GameModule } from '../src/types';

function makeModule(key: string): GameModule {
  return {
    meta: { key, name: key, description: '', instructions: '' },
    mount: () => ({ unmount: vi.fn() }),
  };
}

describe('createGameRegistry', () => {
  it("list() renvoie les modules dans l'ordre d'insertion", () => {
    const reg = createGameRegistry([makeModule('a'), makeModule('b')]);
    expect(reg.list().map((m) => m.meta.key)).toEqual(['a', 'b']);
  });

  it('get() renvoie le module par clé, sinon undefined', () => {
    const reg = createGameRegistry([makeModule('a')]);
    expect(reg.get('a')?.meta.key).toBe('a');
    expect(reg.get('zzz')).toBeUndefined();
  });

  it('lève une erreur sur clé dupliquée', () => {
    expect(() => createGameRegistry([makeModule('a'), makeModule('a')])).toThrow(
      /Duplicate game key: a/,
    );
  });
});
