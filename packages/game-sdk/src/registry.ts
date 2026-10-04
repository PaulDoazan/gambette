import type { GameModule } from './types';

export interface GameRegistry {
  list(): GameModule[];
  get(key: string): GameModule | undefined;
}

export function createGameRegistry(modules: GameModule[]): GameRegistry {
  const byKey = new Map<string, GameModule>();
  for (const m of modules) {
    if (byKey.has(m.meta.key)) {
      throw new Error(`Duplicate game key: ${m.meta.key}`);
    }
    byKey.set(m.meta.key, m);
  }
  return {
    list: () => [...byKey.values()],
    get: (key) => byKey.get(key),
  };
}
