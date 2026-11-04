import { describe, expect, it } from 'vitest';

import { buildSyllabusGrammarExercises, syllabusGrammar } from './grammar-syllabus';

import syllabus from '@/data/hsk30-2025-11.json';

describe('read-only official grammar catalog', () => {
  it('preserves every source point, example and combined advanced band', () => {
    expect(syllabusGrammar).toHaveLength(593);
    expect(syllabusGrammar.filter(point => point.level === '7-9')).toHaveLength(134);
    expect(syllabusGrammar.some(point => ['7', '8', '9'].includes(point.level))).toBe(false);
    expect(syllabusGrammar.reduce((sum, point) => sum + point.examples.length, 0)).toBe(2059);
    expect(syllabusGrammar.flatMap(point => point.examples.map(example => example.hanzi))).toEqual(syllabus.examples.map(example => example.example_zh));
    for (const point of syllabusGrammar) {
      expect(point.pattern).toBeTruthy();
      expect(point.id).toMatch(/^HSK30-2025-GRA-/u);
      const exercises = buildSyllabusGrammarExercises(point);
      expect(exercises.filter(exercise => exercise.kind === 'reorder')).toHaveLength(point.examples.length);
      expect(exercises.filter(exercise => exercise.kind === 'fill_blank')).toHaveLength(point.examples.length);
      for (const exercise of exercises) {
        if (exercise.kind === 'reorder') {
          expect(exercise.tokens.length).toBeLessThanOrEqual(12);
          expect(Array.from(exercise.tokens.join('')).toSorted()).toEqual(Array.from(exercise.answer).toSorted());
          expect(point.examples.some(example => example.hanzi === exercise.answer)).toBe(true);
        } else {
          const blank = exercise.prompt.split('\n').at(-1)!;
          expect(point.examples.some(example => example.hanzi === blank.replace('___', exercise.answer))).toBe(true);
          if (exercise.options.length) expect(exercise.options).toContain(exercise.answer);
        }
      }
    }
  });
});
