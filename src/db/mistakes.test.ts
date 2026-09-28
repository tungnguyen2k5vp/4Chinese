import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { listMistakes, practiceMistake, recordPracticeResult } from './mistakes';

describe('persistent mistake and skill tracking', () => {
  it('practices an unresolved mistake without changing SRS or review history', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await recordPracticeResult(db, { vocabularyId: 'hsk-1-ni', skill: 'PINYIN', exerciseType: 'hanzi_to_pinyin', correct: false });
      const beforeProgress = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      const beforeReviews = sqlite.prepare('SELECT * FROM review_log').all();
      const id = (await listMistakes(db))[0]!.id;
      for (let i = 0; i < 3; i++) await practiceMistake(db, id, { correct: true });
      expect(await listMistakes(db)).toEqual([]);
      await expect(practiceMistake(db, id, { correct: true })).rejects.toThrow('MISTAKE_NOT_OPEN');
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(beforeProgress);
      expect(sqlite.prepare('SELECT * FROM review_log').all()).toEqual(beforeReviews);
    } finally { sqlite.close(); }
  });
  it('rolls back mistake progress when the paired skill write fails', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await recordPracticeResult(db, { vocabularyId: 'hsk-1-ni', skill: 'PINYIN', exerciseType: 'hanzi_to_pinyin', correct: false });
      const id = (await listMistakes(db))[0]!.id;
      sqlite.exec("CREATE TRIGGER reject_skill_update BEFORE UPDATE ON vocabulary_skill_mastery BEGIN SELECT RAISE(ABORT,'test failure'); END");
      await expect(practiceMistake(db, id, { correct: true })).rejects.toThrow('test failure');
      expect((await listMistakes(db))[0]?.correct_streak).toBe(0);
    } finally { sqlite.close(); }
  });
  it('resolves after three unassisted successes, reopens on failure and restores backup', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const input = { vocabularyId: 'hsk-1-ni', skill: 'PINYIN' as const, exerciseType: 'hanzi_to_pinyin' };
      await recordPracticeResult(db, { ...input, correct: false });
      await recordPracticeResult(db, { ...input, correct: true, hintUsed: true });
      expect((await listMistakes(db))[0]?.correct_streak).toBe(0);
      for (let i = 0; i < 3; i++) await recordPracticeResult(db, { ...input, correct: true });
      expect(await listMistakes(db)).toHaveLength(0);
      await recordPracticeResult(db, { ...input, correct: false });
      expect((await listMistakes(db))[0]?.wrong_count).toBe(2);
      const backup = await exportLocalBackup(db, 'test');
      sqlite.exec('DELETE FROM mistake_records; DELETE FROM vocabulary_skill_mastery');
      await importLocalBackup(db, backup);
      expect(await listMistakes(db, 'PINYIN')).toHaveLength(1);
      expect(sqlite.prepare('SELECT pinyin_score FROM vocabulary_skill_mastery').get()).toEqual({ pinyin_score: 20 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
