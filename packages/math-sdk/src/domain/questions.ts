import { computeAnswer, type Op, type Pair } from './calcs';
import { generateDistractors, type Difficulty } from './distractors';
import { mulberry32, pickFrom, shuffle, type Rng } from './rng';

export interface Question {
  readonly a: number;
  readonly b: number;
  readonly op: Op;
  readonly answer: number;
  readonly choices: readonly number[];
}

export interface QuestionRequest {
  readonly pairs: readonly Pair[];
  readonly difficulty: Difficulty;
  readonly count: number;
  readonly choicesCount: number;
  readonly seed: number;
}

const pickPair = (pool: readonly Pair[], previous: Pair | null, rng: Rng): Pair => {
  if (pool.length <= 1 || !previous) return pickFrom(pool, rng);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = pickFrom(pool, rng);
    if (candidate.a !== previous.a || candidate.b !== previous.b) return candidate;
  }
  return pickFrom(pool, rng);
};

const buildQuestion = (
  pair: Pair,
  difficulty: Difficulty,
  choicesCount: number,
  rng: Rng,
): Question => {
  const answer = computeAnswer(pair);
  const distractors = generateDistractors(answer, difficulty, choicesCount - 1, rng);
  return {
    a: pair.a,
    b: pair.b,
    op: pair.op,
    answer,
    choices: shuffle([answer, ...distractors], rng),
  };
};

export function generateQuestions(req: QuestionRequest): Question[] {
  const rng = mulberry32(req.seed);
  const out: Question[] = [];
  let previous: Pair | null = null;
  for (let i = 0; i < req.count; i++) {
    const pair = pickPair(req.pairs, previous, rng);
    out.push(buildQuestion(pair, req.difficulty, req.choicesCount, rng));
    previous = pair;
  }
  return out;
}
