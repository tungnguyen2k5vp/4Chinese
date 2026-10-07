import { describe, expect, it } from 'vitest';

import { advancedGrammarV5Plan, grammarV5Expansion, listGrammarV5ReviewQueue,
  validateGrammarV5Draft, validateGrammarV5DraftPack } from './grammar-v5-expansion';

import { buildGrammarV5ReviewPreview } from '@/services/learning/vietnamese-contrasts';

const normalize = (text: string) => text.replace(/[\s。！？!?.,，；;：:]/gu, '');

describe('24 pending V5 grammar points', () => {
  it('has four points per estimated band, two aligned examples, a contextual correction and valid options each', () => {
    const points = validateGrammarV5DraftPack(grammarV5Expansion);
    expect(points).toHaveLength(24);
    expect(points.flatMap((point) => point.examples)).toHaveLength(48);
    for (const band of ['1', '2', '3', '4', '5', '6']) expect(listGrammarV5ReviewQueue(band)).toHaveLength(4);
    for (const point of points) {
      expect(point).toMatchObject({ sourceType: 'AI_ASSISTED', reviewStatus: 'PENDING',
        publicationRequiresReview: true, levelMapping: 'INTERNAL_ESTIMATE', contentVersion: 1 });
      expect(point.options.filter((option) => option === point.answer)).toHaveLength(1);
      expect(new Set(point.options).size).toBe(point.options.length);
      expect(point.quiz.replace('___', point.answer)).not.toContain('___');
      expect(point.examples.some((example) => example.hanzi.includes(point.answer))).toBe(true);
      expect(point.commonMistake.wrong).not.toBe(point.commonMistake.correct);
      expect(point.commonMistake.why.length).toBeGreaterThan(15);
      expect(point.vietnameseContrast.length).toBeGreaterThan(15);
      for (const example of point.examples) {
        expect(normalize(example.words.join(''))).toBe(normalize(example.hanzi));
        expect(example.pinyin).toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔù]/u);
        expect(example.vi.length).toBeGreaterThanOrEqual(10);
        expect(example.en.length).toBeGreaterThan(10);
      }
    }
    expect(listGrammarV5ReviewQueue('7-9')).toEqual([]);
    expect(advancedGrammarV5Plan).toMatchObject({ requiredPoints: null, verifiedPoints: [], reviewStatus: 'PENDING' });
  });

  it('provides source-only unreviewed previews with five usable exercise forms', () => {
    for (const point of grammarV5Expansion) {
      const preview = buildGrammarV5ReviewPreview(point.id)!;
      expect(preview.learnerVisible).toBe(false);
      expect(preview.review).toEqual({ id: point.id, revision: 0, state: 'DRAFT', origin: 'AI_ASSISTED' });
      expect(new Set(preview.exercises.map((exercise) => exercise.kind))).toEqual(new Set(['choice', 'fill_blank', 'reorder', 'translation', 'correction']));
      for (const exercise of preview.exercises) {
        if (exercise.options.length) expect(exercise.options).toContain(exercise.answer);
        if (exercise.kind === 'reorder') expect([...exercise.tokens].sort()).toEqual([...point.examples[0]!.words].sort());
        if (exercise.kind === 'correction') expect(exercise).toMatchObject({ prompt: point.commonMistake.wrong,
          answer: point.commonMistake.correct, explanation: point.commonMistake.why });
      }
    }
    expect(buildGrammarV5ReviewPreview('not-a-draft')).toBeNull();
  });

  it('rejects malformed options/alignment/corrections, duplicate IDs and review promotion', () => {
    const point = grammarV5Expansion[0]!;
    expect(() => validateGrammarV5Draft({ ...point, options: ['是', '有', '不'] })).toThrow();
    expect(() => validateGrammarV5Draft({ ...point, options: ['很', '很', '不'] })).toThrow();
    expect(() => validateGrammarV5Draft({ ...point, examples: [point.examples[0]] })).toThrow();
    expect(() => validateGrammarV5Draft({ ...point, examples: point.examples.map((example) => ({ ...example, words: ['错', '误'] })) })).toThrow();
    expect(() => validateGrammarV5Draft({ ...point, commonMistake: { ...point.commonMistake, wrong: point.commonMistake.correct } })).toThrow();
    expect(() => validateGrammarV5Draft({ ...point, reviewStatus: 'VERIFIED' })).toThrow();
    expect(() => validateGrammarV5DraftPack([...grammarV5Expansion.slice(1), grammarV5Expansion[1]])).toThrow('DUPLICATE_GRAMMAR_DRAFT_ID');
    const queue = listGrammarV5ReviewQueue();
    queue[0]!.commonMistake.why = 'Changed preview';
    expect(grammarV5Expansion[0]!.commonMistake.why).not.toBe('Changed preview');
  });
});
