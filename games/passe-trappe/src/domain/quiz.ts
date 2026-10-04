import {
  computeAnswer,
  generateDistractors,
  pickFrom,
  shuffle,
  type Difficulty,
  type Pair,
  type Rng,
} from '@gambette/math-sdk';

/** Écart des mauvaises réponses : comme rabbit-math (3 à 9 de la bonne réponse). */
export const QUIZ_DIFFICULTY: Difficulty = 'medium';

const samePair = (p: Pair, q: Pair): boolean => p.a === q.a && p.b === q.b && p.op === q.op;

/** Tire un calcul parmi ceux choisis, en évitant le précédent quand c'est possible. */
export function pickCalc(pairs: readonly Pair[], previous: Pair | null, rng: Rng): Pair {
  const others = previous ? pairs.filter((p) => !samePair(p, previous)) : pairs;
  return pickFrom(others.length > 0 ? others : pairs, rng);
}

export interface CampLabels {
  /** Index (dans l'ordre des palets du camp) du palet portant la bonne réponse. */
  correctIndex: number;
  values: number[];
}

/**
 * Complète avec les entiers non négatifs les plus proches de `answer` non encore utilisés,
 * de façon déterministe : par distance croissante, la valeur la plus grande d'abord.
 */
function topUp(answer: number, used: Set<number>, missing: number): number[] {
  const extra: number[] = [];
  for (let d = 1; extra.length < missing; d++) {
    for (const v of [answer + d, answer - d]) {
      if (extra.length < missing && v >= 0 && !used.has(v)) {
        used.add(v);
        extra.push(v);
      }
    }
  }
  return extra;
}

/** Étiquettes des `count` palets d'un camp : une bonne réponse, des mauvaises proches et distinctes. */
export function labelCamp(pair: Pair, count: number, rng: Rng): CampLabels | null {
  if (count === 0) return null;
  const answer = computeAnswer(pair);
  const wrong = [...new Set(generateDistractors(answer, QUIZ_DIFFICULTY, count - 1, rng))].filter(
    (v) => v !== answer,
  );
  if (wrong.length < count - 1) {
    wrong.push(...topUp(answer, new Set([answer, ...wrong]), count - 1 - wrong.length));
  }
  const values = shuffle([answer, ...wrong.slice(0, count - 1)], rng);
  return { correctIndex: values.indexOf(answer), values };
}
