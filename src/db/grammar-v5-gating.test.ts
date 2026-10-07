import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { grammarSeed, listGrammarExamples, listGrammarPoints, recordGrammarAnswer, seedGrammarContent } from './grammar';
import { migrateDatabaseSchema } from './migrations';
import { searchAllContent } from './unified-search';

import { grammarV5Expansion } from '@/data/grammar-v5-expansion';

describe('V5 grammar draft staging isolation', () => {
  it('does not stage by default; explicit staging is hidden and idempotent in real SQLite/search', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db); await seedGrammarContent(db, []);
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM grammar_points WHERE id GLOB 'v5-*'").get()).toEqual({ n: 0 });
      const publishedBefore = await listGrammarPoints(db);
      await recordGrammarAnswer(db, 'gram-shi', true, { id: 'preserved-before-stage', exerciseType: 'grammar_choice' });
      const progressBefore = sqlite.prepare('SELECT * FROM grammar_progress').all();
      const vocabularyBefore = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      await seedGrammarContent(db, [], { includePendingDrafts: true });
      const counts = () => ['grammar_points', 'sentences', 'grammar_examples', 'sentence_grammar'].map((table) =>
        sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get());
      const stagedCounts = counts();
      await seedGrammarContent(db, [], { includePendingDrafts: true });
      expect(counts()).toEqual(stagedCounts);
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM grammar_points WHERE id GLOB 'v5-*' AND is_active=0").get()).toEqual({ n: 24 });
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM sentences WHERE id GLOB 'sentence-v5-*' AND is_active=0 AND review_status='PENDING'").get()).toEqual({ n: 48 });
      expect((await listGrammarPoints(db)).map((point) => point.id)).toEqual(publishedBefore.map((point) => point.id));
      expect(await listGrammarPoints(db)).toHaveLength(grammarSeed.length);
      for (const point of grammarV5Expansion) {
        expect(await listGrammarExamples(db, point.id)).toEqual([]);
        const hits = await searchAllContent(db, point.title);
        expect(hits.some((hit) => hit.kind === 'GRAMMAR' && hit.id === point.id)).toBe(false);
      }
      expect((await searchAllContent(db, 'Câu với 是')).some((hit) => hit.id === 'gram-shi')).toBe(true);
      expect(sqlite.prepare('SELECT * FROM grammar_progress').all()).toEqual(progressBefore);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(vocabularyBefore);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('repairs partial active draft rows without rewriting content/progress, and rejects draft XP attempts', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db); await seedGrammarContent(db, [], { includePendingDrafts: true });
      const point = grammarV5Expansion[0]!;
      sqlite.prepare('UPDATE grammar_points SET is_active=1,explanation_vi=? WHERE id=?').run('Saved editorial note', point.id);
      sqlite.prepare('UPDATE sentences SET is_active=1 WHERE id=?').run(`sentence-${point.id}-1`);
      expect(sqlite.prepare('SELECT is_active FROM grammar_points WHERE id=?').get(point.id)).toEqual({ is_active: 1 });
      // Main's parallel search hardening also excludes reserved draft IDs, even before repair.
      expect((await searchAllContent(db, point.title)).some((hit) => hit.id === point.id)).toBe(false);
      const xpBefore = sqlite.prepare('SELECT * FROM xp_events').all();
      await expect(recordGrammarAnswer(db, point.id, true)).rejects.toThrow('GRAMMAR_NOT_LEARNER_VISIBLE');
      await seedGrammarContent(db, []);
      expect(sqlite.prepare('SELECT is_active,explanation_vi FROM grammar_points WHERE id=?').get(point.id)).toEqual({ is_active: 0, explanation_vi: 'Saved editorial note' });
      expect(sqlite.prepare('SELECT is_active,review_status FROM sentences WHERE id=?').get(`sentence-${point.id}-1`)).toEqual({ is_active: 0, review_status: 'PENDING' });
      expect((await searchAllContent(db, point.title)).some((hit) => hit.id === point.id)).toBe(false);
      await expect(recordGrammarAnswer(db, point.id, true)).rejects.toThrow('GRAMMAR_NOT_LEARNER_VISIBLE');
      expect(sqlite.prepare('SELECT * FROM xp_events').all()).toEqual(xpBefore);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM grammar_attempts').get()).toEqual({ n: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM grammar_progress').get()).toEqual({ n: 0 });
      sqlite.prepare('UPDATE grammar_points SET is_active=0 WHERE id=?').run('gram-shi');
      expect((await listGrammarPoints(db)).some((point) => point.id === 'gram-shi')).toBe(false);
      expect(await listGrammarExamples(db, 'gram-shi')).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('rolls back the whole draft seed if an example insert fails', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db); await seedGrammarContent(db, []);
      const before = sqlite.prepare('SELECT COUNT(*) AS n FROM sentences').get();
      sqlite.exec("CREATE TRIGGER fail_draft_sentence BEFORE INSERT ON sentences WHEN NEW.id='sentence-v5-yidan-2' BEGIN SELECT RAISE(ABORT,'test interrupted draft seed'); END;");
      await expect(seedGrammarContent(db, [], { includePendingDrafts: true })).rejects.toThrow('test interrupted draft seed');
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM grammar_points WHERE id GLOB 'v5-*'").get()).toEqual({ n: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM sentences').get()).toEqual(before);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
