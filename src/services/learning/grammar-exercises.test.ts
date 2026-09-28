import { describe, expect, it } from 'vitest';

import { buildGrammarExercises, isGrammarAnswerCorrect } from './grammar-exercises';

import { grammarSeed } from '@/db/grammar';

describe('grammar exercises use authored examples and explicit answers', () => {
  it('provides five distinct, answerable types for all existing grammar points', () => {
    for (const seed of grammarSeed) {
      const exercises = buildGrammarExercises(seed, grammarSeed);
      expect(exercises.map((item) => item.kind)).toEqual(['choice', 'fill_blank', 'reorder', 'translation', 'correction']);
      expect(new Set(exercises.map((item) => item.id)).size).toBe(5);
      for (const exercise of exercises) {
        expect(isGrammarAnswerCorrect(exercise, exercise.answer)).toBe(true);
        if (exercise.options.length) {
          expect(exercise.options).toContain(exercise.answer);
          expect(new Set(exercise.options).size).toBe(exercise.options.length);
          for (const wrong of exercise.options.filter((option) => option !== exercise.answer)) expect(isGrammarAnswerCorrect(exercise, wrong)).toBe(false);
        }
      }
    }
  });
  it('accepts harmless punctuation/spacing but not wrong word order or missing characters', () => {
    const exercises = buildGrammarExercises(grammarSeed[0]!, grammarSeed);
    const order = exercises.find((item) => item.kind === 'reorder')!;
    expect(isGrammarAnswerCorrect(order, ' 我 是 学生 。 ')).toBe(true);
    expect(isGrammarAnswerCorrect(order, '我是学')).toBe(false);
    expect(isGrammarAnswerCorrect(order, '学生是我')).toBe(false);
    expect(isGrammarAnswerCorrect(order, '')).toBe(false);
  });
});
