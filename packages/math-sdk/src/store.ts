import { randomMulPairs, type Op, type Pair } from './domain/calcs';

export interface CalcsStore {
  load(): Pair[];
  save(pairs: readonly Pair[]): void;
}

export interface CalcsStoreOptions {
  /** Sélection utilisée si rien de valide n'est stocké (défaut : 10 multiplications au hasard). */
  defaults?: () => Pair[];
}

export const calcsStorageKey = (gameKey: string): string => `gambette.${gameKey}.calcs`;

const isOp = (v: unknown): v is Op => v === 'mul' || v === 'add' || v === 'sub';

const toPair = (v: unknown): Pair | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.a !== 'number' || typeof o.b !== 'number') return null;
  if (o.op === undefined) return { a: o.a, b: o.b, op: 'mul' };
  return isOp(o.op) ? { a: o.a, b: o.b, op: o.op } : null;
};

const parsePairs = (raw: string | null): Pair[] | null => {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const pairs = data.map(toPair);
  return pairs.every((p): p is Pair => p !== null) ? pairs : null;
};

const readRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function createCalcsStore(gameKey: string, opts: CalcsStoreOptions = {}): CalcsStore {
  const key = calcsStorageKey(gameKey);
  const defaults = opts.defaults ?? (() => randomMulPairs());
  return {
    load: () => parsePairs(readRaw(key)) ?? defaults(),
    save: (pairs) => {
      try {
        localStorage.setItem(key, JSON.stringify(pairs));
      } catch {
        // Stockage indisponible (navigation privée, quota) : la sélection vit le temps de la session.
      }
    },
  };
}
