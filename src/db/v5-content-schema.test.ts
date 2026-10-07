import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { contextCloze, listVocabularyContexts, saveVocabularyContext, validateContextRecord } from './vocabulary-context';

describe('V5 additive content and personal contexts', () => {
  it('upgrades V4 without changing learner rows; reruns safely', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.exec('PRAGMA user_version=35');
      const before = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      await migrateDatabaseSchema(db); await migrateDatabaseSchema(db);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(before);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM word_senses').get()).toEqual({n:0});
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('allows distinct sense pronunciations and rejects broken sense/example links', async () => {
    const sqlite = createLegacyDatabase();
    try {
      await migrateDatabaseSchema(expoAdapter(sqlite));
      const insert = sqlite.prepare(`INSERT INTO word_senses(vocabulary_id,sense_id,part_of_speech,definition_vi,pinyin_numeric,source_ref)
        VALUES('custom-1',?,'động từ',?,?,'internal:draft')`);
      insert.run('a','nghĩa thứ nhất','xing2'); insert.run('b','nghĩa thứ hai','hang2');
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM word_senses').get()).toEqual({n:2});
      expect(() => sqlite.exec(`INSERT INTO word_sense_examples VALUES('custom-1','missing','missing')`)).toThrow();
      expect(() => sqlite.exec(`UPDATE word_senses SET review_status='VERIFIED'`)).toThrow();
    } finally { sqlite.close(); }
  });

  it('round trips contexts, keeps them with older backups, and rolls back invalid restore', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const input = { vocabularyId:'custom-1', sourceType:'READER' as const,sourceId:'doc-1',location:'0:2',sentence:'我说您好。'};
      await saveVocabularyContext(db,input,'2026-10-01T08:00:00Z');
      await saveVocabularyContext(db,input,'2026-10-01T09:00:00Z');
      const rows = await listVocabularyContexts(db,'custom-1');
      expect(rows).toHaveLength(1); expect(rows[0]?.created_at).toBe('2026-10-01T08:00:00Z');
      const backup = await exportLocalBackup(db,'test');
      sqlite.exec('DELETE FROM personal_vocabulary_context');
      await importLocalBackup(db,backup);
      expect(await listVocabularyContexts(db,'custom-1')).toEqual(rows);
      const older = {...backup,data:{...backup.data}}; delete older.data.personalVocabularyContexts;
      await importLocalBackup(db,older);
      expect(await listVocabularyContexts(db,'custom-1')).toEqual(rows);
      backup.data.personalVocabularyContexts![0]!.sentence = '';
      await expect(importLocalBackup(db,backup)).rejects.toThrow('INVALID_PERSONAL_CONTEXT');
      expect(await listVocabularyContexts(db,'custom-1')).toEqual(rows);
    } finally { sqlite.close(); }
  });

  it('never leaks repeated or traditional answers in cloze', () => {
    expect(contextCloze('学习，也要學習；学习。',['学习','學習'])).toBe('＿＿，也要＿＿；＿＿。');
    expect(contextCloze('没有目标字。',['学习'])).toBeNull();
    expect(() => validateContextRecord({sentence:'x'})).toThrow();
  });
});
