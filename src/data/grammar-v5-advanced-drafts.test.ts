import { describe, expect, it } from 'vitest';

import { advancedGrammarV5Drafts, listAdvancedGrammarV5ReviewQueue,
  validateAdvancedGrammarV5Draft, validateAdvancedGrammarV5Pack } from './grammar-v5-advanced-drafts';
import { grammarV5Expansion, validateGrammarV5DraftPack } from './grammar-v5-expansion';

import { createLegacyDatabase, expoAdapter } from '@/db/fixtures/legacy_database';
import { grammarSeed, listGrammarExamples, listGrammarPoints, recordGrammarAnswer, seedGrammarContent } from '@/db/grammar';
import { migrateDatabaseSchema } from '@/db/migrations';
import { searchAllContent } from '@/db/unified-search';
import { buildGrammarV5ReviewPreview } from '@/services/learning/vietnamese-contrasts';

describe('source-only advanced grammar drafts', () => {
  it('keeps four unique drafts and eight aligned examples explicitly unverified, backed only by local patterns', () => {
    const points = listAdvancedGrammarV5ReviewQueue();
    expect(points.map((point) => point.id)).toEqual(['v5-advanced-exception-policy', 'v5-advanced-inference-limits',
      'v5-advanced-causal-mechanism', 'v5-advanced-decision-criteria']);
    expect(points.flatMap((point) => point.examples)).toHaveLength(8);
    expect(validateGrammarV5DraftPack(grammarV5Expansion)).toHaveLength(24);
    for (const point of points) {
      expect(point).toMatchObject({ hsk: '7-9', sourceType: 'AI_ASSISTED', draftState: 'DRAFT', verificationStatus: 'UNVERIFIED',
        reviewStatus: 'PENDING', learnerVisible: false, publicationRequiresReview: true, levelMapping: 'INTERNAL_ESTIMATE',
        editorialScope: 'EXTENDED_LOCAL_PATTERNS_NOT_OFFICIAL_SYLLABUS' });
      expect(point.explanation).toContain('không phải phân loại hay độ phủ HSK chính thức');
      expect(point.sourceRefs.every((ref) => ref.kind === 'LOCAL_PATTERN_NOT_OFFICIAL_REFERENCE')).toBe(true);
      expect(grammarSeed.some((seed) => seed.id === point.id)).toBe(false);
      for (const example of point.examples) {
        expect(example.words.join('')).toBe(example.hanzi.replace(/[。！？，；：]/gu, ''));
        expect(example.pinyin).toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔù]/u);
        expect(example.vi.trim()).not.toBe(''); expect(example.en.trim()).not.toBe('');
      }
      const preview = buildGrammarV5ReviewPreview(point.id)!;
      expect(preview.learnerVisible).toBe(false);
      expect(preview.review).toEqual({ id: point.id, revision: 0, state: 'DRAFT', origin: 'AI_ASSISTED' });
      expect(preview.exercises).toHaveLength(5);
      for (const exercise of preview.exercises) if (exercise.options.length) expect(exercise.options).toContain(exercise.answer);
    }
    points[0]!.commonMistake.why = 'Changed queue';
    expect(advancedGrammarV5Drafts[0]!.commonMistake.why).not.toBe('Changed queue');
  });

  it('rejects fabricated references, review promotion, broken alignment/options and duplicate IDs', () => {
    const point = advancedGrammarV5Drafts[0]!;
    expect(() => validateAdvancedGrammarV5Draft({ ...point, sourceRefs: [{ ...point.sourceRefs[0], pointId: 'missing' }] })).toThrow('UNKNOWN_LOCAL_GRAMMAR_SOURCE');
    expect(() => validateAdvancedGrammarV5Draft({ ...point, verificationStatus: 'VERIFIED' })).toThrow();
    expect(() => validateAdvancedGrammarV5Draft({ ...point, draftState: 'PUBLISHED' })).toThrow();
    expect(() => validateAdvancedGrammarV5Draft({ ...point, learnerVisible: true })).toThrow();
    expect(() => validateAdvancedGrammarV5Draft({ ...point, options: ['否则', '否则', '而且'] })).toThrow();
    expect(() => validateAdvancedGrammarV5Draft({ ...point, examples: point.examples.map((example) => ({ ...example, words: ['错', '误'] })) })).toThrow();
    expect(() => validateAdvancedGrammarV5Pack([point, point])).toThrow('DUPLICATE_ADVANCED_GRAMMAR_DRAFT_ID');
  });

  it('does not seed advanced drafts even with existing draft staging enabled, and rejects learner attempts', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await seedGrammarContent(db, []);
      await seedGrammarContent(db, [], { includePendingDrafts: true });
      expect(await listGrammarPoints(db, '7-9')).toEqual([]);
      for (const point of advancedGrammarV5Drafts) {
        expect(sqlite.prepare('SELECT id FROM grammar_points WHERE id=?').get(point.id)).toBeUndefined();
        expect(await listGrammarExamples(db, point.id)).toEqual([]);
        expect((await searchAllContent(db, point.title)).some((result) => result.id === point.id)).toBe(false);
        await expect(recordGrammarAnswer(db, point.id, true)).rejects.toThrow('GRAMMAR_NOT_LEARNER_VISIBLE');
      }
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM grammar_attempts').get()).toEqual({ n: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM grammar_progress').get()).toEqual({ n: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM xp_events').get()).toEqual({ n: 0 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
