import { describe, expect, it } from 'vitest';

import { buildGrammarExercises, isGrammarAnswerCorrect, normalizeGrammarAnswer, selectGrammarExercise } from './grammar-exercises';

import { grammarSeed } from '@/db/grammar';

describe('grammar exercise pool', () => {
  it('reports actual coverage', () => {
    const pools = grammarSeed.map(seed => buildGrammarExercises(seed, grammarSeed));
    expect(pools.flat()).toHaveLength(720);
    const correctionPools = pools.map(pool => pool.filter(item => item.kind === 'correction')).filter(pool => pool.length);
    expect(correctionPools).toHaveLength(20);
    expect(correctionPools.every(pool => pool.length >= 2)).toBe(true);
    expect(pools.flat().some(item => /\p{L}\?\p{L}/u.test(item.label + item.prompt))).toBe(false);
  });
  it('uses every authored example and provides distinct completion questions', () => {
    for (const seed of grammarSeed) {
      const exercises = buildGrammarExercises(seed, grammarSeed);
      expect(new Set(exercises.map(item => item.id)).size).toBe(exercises.length);
      for (const kind of ['reorder', 'translation'] as const) {
        const questions = exercises.filter(item => item.kind === kind);
        expect(new Set(questions.map(item => item.answer)).size, seed.id + ':' + kind).toBeGreaterThan(1);
      }
      for (const kind of ['choice', 'fill_blank'] as const) {
        const questions = exercises.filter(item => item.kind === kind);
        expect(questions.length).toBeGreaterThan(1);
        expect(new Set(questions.map(item => item.prompt)).size).toBe(questions.length);
      }
      for (const example of seed.examples) {
        expect(exercises.some(item => item.kind === 'translation' && item.answer === example.hanzi)).toBe(true);
        expect(exercises.some(item => item.kind === 'reorder' && normalizeGrammarAnswer(item.answer) === normalizeGrammarAnswer(example.hanzi)), seed.id).toBe(true);
      }
      for (const exercise of exercises) {
        expect(isGrammarAnswerCorrect(exercise, exercise.answer)).toBe(true);
        if (exercise.options.length) {
          expect(exercise.options).toContain(exercise.answer);
          expect(new Set(exercise.options).size).toBe(exercise.options.length);
          for (const wrong of exercise.options.filter(option => option !== exercise.answer)) expect(isGrammarAnswerCorrect(exercise, wrong)).toBe(false);
        }
      }
    }
  });
  it('does not invent errors by removing optional connectors', () => {
    for (const id of ['gram-suiran-danshi', 'gram-ruguo-jiu', 'gram-yinwei-suoyi']) {
      const seed = grammarSeed.find(item => item.id === id)!;
      expect(buildGrammarExercises(seed, grammarSeed).filter(item => item.kind === 'correction')).toEqual([]);
    }
  });
  it('cycles actual questions and accepts only exact normalized Chinese', () => {
    const exercises = buildGrammarExercises(grammarSeed[0]!, grammarSeed);
    const order = exercises.find(item => item.kind === 'reorder')!;
    expect(isGrammarAnswerCorrect(order, ' 我 是 学生 。 ')).toBe(true);
    for (const answer of ['我是学', '学生是我', '']) expect(isGrammarAnswerCorrect(order, answer)).toBe(false);
    expect(selectGrammarExercise(exercises, 'choice', 1)?.id).not.toBe(selectGrammarExercise(exercises, 'choice', 0)?.id);
    expect(selectGrammarExercise([], 'choice')).toBeUndefined();
  });
});
