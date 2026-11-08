// Repris de math-river (domain/quiz.ts) : même tirage de calcul.
import { computeAnswer, pickFrom, type Pair, type Rng } from '@gambette/math-sdk';

const samePair = (p: Pair, q: Pair): boolean => p.a === q.a && p.b === q.b && p.op === q.op;

/**
 * Tire un calcul parmi ceux choisis, en évitant le précédent quand c'est possible, et même son
 * résultat : deux réseaux de suite ne demandent pas « = 42 ».
 */
export function pickCalc(pairs: readonly Pair[], previous: Pair | null, rng: Rng): Pair {
  if (!previous) return pickFrom(pairs, rng);
  const result = computeAnswer(previous);
  const fresh = pairs.filter((p) => computeAnswer(p) !== result);
  if (fresh.length > 0) return pickFrom(fresh, rng);
  const others = pairs.filter((p) => !samePair(p, previous));
  return pickFrom(others.length > 0 ? others : pairs, rng);
}
