import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { grammarSeed, listGrammarExamples, listGrammarPoints, recordGrammarAnswer, seedGrammarContent } from './grammar';
import { migrateDatabaseSchema } from './migrations';

import type { Vocabulary } from '@/types/models';

describe('shared grammar and sentence graph', () => {
  it('seeds once, links examples and preserves practice in backup', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const knownWords = [{ id: 'hsk-1-ni', simplified: '你' }] as Vocabulary[];
      await seedGrammarContent(db, knownWords);
      await seedGrammarContent(db, knownWords);
      expect(await listGrammarPoints(db)).toHaveLength(grammarSeed.length);
      expect(await listGrammarExamples(db, 'gram-shi')).toHaveLength(2);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM sentences').get()).toEqual({ n: 14 });
      await recordGrammarAnswer(db, 'gram-shi', true);
      await recordGrammarAnswer(db, 'gram-shi', false);
      const backup = await exportLocalBackup(db, 'test');
      expect(backup.data.grammarProgress).toHaveLength(1);
      sqlite.exec('DELETE FROM grammar_progress');
      await importLocalBackup(db, backup);
      expect(sqlite.prepare("SELECT attempts,correct FROM grammar_progress WHERE grammar_id='gram-shi'").get())
        .toEqual({ attempts: 2, correct: 1 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('keeps every seeded quiz answer among choices', () => {
    for (const grammar of grammarSeed) expect(grammar.options).toContain(grammar.answer);
  });
  it('deduplicates a retried grammar answer with atomic XP/mistake/backup writes', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await seedGrammarContent(db, []);
      const before = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      const attempt = { id: 'grammar-attempt-1', exerciseType: 'grammar_reorder' };
      await recordGrammarAnswer(db, 'gram-shi', true, attempt);
      await recordGrammarAnswer(db, 'gram-shi', true, attempt);
      expect(sqlite.prepare("SELECT attempts,correct FROM grammar_progress WHERE grammar_id='gram-shi'").get()).toEqual({ attempts: 1, correct: 1 });
      expect(sqlite.prepare('SELECT SUM(points) AS xp FROM xp_events').get()).toEqual({ xp: 5 });
      const backup = await exportLocalBackup(db, 'test');
      expect(backup.data.grammarAttempts).toHaveLength(1);
      await importLocalBackup(db, backup);
      await recordGrammarAnswer(db, 'gram-shi', true, attempt);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM grammar_attempts').get()).toEqual({ n: 1 });
      await expect(recordGrammarAnswer(db, 'missing', false, { id: 'bad', exerciseType: 'grammar_correction' })).rejects.toThrow();
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM grammar_attempts').get()).toEqual({ n: 1 });
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(before);
    } finally { sqlite.close(); }
  });
});
