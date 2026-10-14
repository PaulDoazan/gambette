import { generateQuestions, opSymbol, type Pair, type Question } from '@gambette/math-sdk';

export const CHOICES_COUNT = 5;
const BATCH_SIZE = 50;

export interface QuestionFeed {
  next(): Question;
}

/**
 * Flux infini de questions (la tour n'a pas de fin) : génère des lots via
 * math-sdk et en relance un, graine suivante, dès que le précédent est épuisé.
 */
export function createQuestionFeed(
  pairs: readonly Pair[],
  seed: number = Date.now(),
): QuestionFeed {
  let batch: Question[] = [];
  let index = 0;
  let batches = 0;
  return {
    next(): Question {
      if (index >= batch.length) {
        batch = generateQuestions({
          pairs,
          difficulty: 'medium',
          count: BATCH_SIZE,
          choicesCount: CHOICES_COUNT,
          seed: seed + batches++,
        });
        index = 0;
      }
      return batch[index++] as Question;
    },
  };
}

export const formatCalc = (q: Pick<Question, 'a' | 'b' | 'op'>): string =>
  `${q.a} ${opSymbol(q.op)} ${q.b}`;

export const formatSolved = (q: Pick<Question, 'a' | 'b' | 'op' | 'answer'>): string =>
  `${formatCalc(q)} = ${q.answer}`;
