import { shuffle, type Rng } from './rng';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface Range {
  readonly min: number;
  readonly max: number;
}
const DIFFICULTY_RANGES: Record<Difficulty, Range> = {
  easy: { min: 10, max: 100 },
  medium: { min: 3, max: 9 },
  hard: { min: 1, max: 5 },
};

const candidatesIn = (answer: number, range: Range): number[] => {
  const out: number[] = [];
  for (let v = 2; v <= 100; v++) {
    if (v === answer) continue;
    const dist = Math.abs(v - answer);
    if (dist >= range.min && dist <= range.max) out.push(v);
  }
  return out;
};

const ensureNeighbour = (answer: number, picks: number[], pool: number[]): number[] => {
  if (picks.some((p) => Math.abs(p - answer) === 1)) return picks;
  const neighbours = pool.filter((v) => Math.abs(v - answer) === 1);
  if (neighbours.length === 0) return picks;
  const replaced = picks.slice();
  replaced[0] = neighbours[0] as number;
  return replaced;
};

const widenIfNeeded = (answer: number, range: Range, target: number): number[] => {
  let r = range;
  let pool = candidatesIn(answer, r);
  while (pool.length < target) {
    r = { min: Math.max(1, r.min - 1), max: r.max + 5 };
    pool = candidatesIn(answer, r);
    if (r.min === 1 && r.max >= 100) break;
  }
  return pool;
};

export function generateDistractors(
  answer: number,
  difficulty: Difficulty,
  count: number,
  rng: Rng,
): number[] {
  const range = DIFFICULTY_RANGES[difficulty];
  const pool = widenIfNeeded(answer, range, count);
  if (pool.length < count) {
    console.warn(`Not enough distractors for answer=${answer} difficulty=${difficulty}`);
  }
  const picks = shuffle(pool, rng).slice(0, count);
  return difficulty === 'hard' ? ensureNeighbour(answer, picks, pool) : picks;
}
