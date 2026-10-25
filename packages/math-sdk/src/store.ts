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

const writeRaw = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée, quota) : la sélection vit le temps de la session.
  }
};

export function createCalcsStore(gameKey: string, opts: CalcsStoreOptions = {}): CalcsStore {
  const key = calcsStorageKey(gameKey);
  const defaults = opts.defaults ?? (() => randomMulPairs());
  return {
    load: () => parsePairs(readRaw(key)) ?? defaults(),
    save: (pairs) => writeRaw(key, JSON.stringify(pairs)),
  };
}

/** Calculs d'un jeu à deux : A en bas, B en haut, ou les mêmes pour les deux (`same`). */
export interface PlayersCalcs {
  same: boolean;
  A: Pair[];
  B: Pair[];
}

export interface PlayersCalcsStore {
  load(): PlayersCalcs;
  save(calcs: PlayersCalcs): void;
}

/**
 * Stockage des calculs par joueur. Le joueur du bas garde la clé de `createCalcsStore` (une
 * sélection déjà enregistrée n'est pas perdue) ; le joueur du haut en part tant qu'il n'a pas la
 * sienne, qui reste enregistrée même quand les deux reprennent les mêmes calculs.
 */
export function createPlayersCalcsStore(
  gameKey: string,
  opts: CalcsStoreOptions = {},
): PlayersCalcsStore {
  const a = createCalcsStore(gameKey, opts);
  const keyB = `${calcsStorageKey(gameKey)}.B`;
  const keySame = `${calcsStorageKey(gameKey)}.same`;
  return {
    load: () => {
      const A = a.load();
      return { same: readRaw(keySame) !== 'false', A, B: parsePairs(readRaw(keyB)) ?? A };
    },
    save: (c) => {
      a.save(c.A);
      writeRaw(keyB, JSON.stringify(c.B));
      writeRaw(keySame, String(c.same));
    },
  };
}

/** Sélection que joue chaque joueur. */
export const pairsOf = (c: PlayersCalcs): { A: Pair[]; B: Pair[] } => ({
  A: c.A,
  B: c.same ? c.A : c.B,
});

const pairKey = (p: Pair): string => `${p.op}:${p.a}:${p.b}`;

const samePairs = (a: readonly Pair[], b: readonly Pair[]): boolean => {
  const ka = new Set(a.map(pairKey));
  return a.length === b.length && b.every((p) => ka.has(pairKey(p)));
};

/** Les réglages de calculs ont changé (l'ordre des calculs ne compte pas). */
export const playersCalcsChanged = (a: PlayersCalcs, b: PlayersCalcs): boolean =>
  a.same !== b.same || !samePairs(a.A, b.A) || !samePairs(a.B, b.B);
