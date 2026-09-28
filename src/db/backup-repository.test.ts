import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { DATABASE_VERSION } from './schema';

import bundledHsk from '@/data/hsk-vocabulary.json';

describe('local backup against real SQLite', () => {
  it('backs up and restores a learner edit to a bundled HSK word without changing its ID', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const word = bundledHsk[0];
      if (!word) throw new Error('Missing HSK fixture');
      sqlite.prepare(`INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,
        meanings_vi,meanings_en,pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`).run(word.id, word.simplified, word.traditional,
        word.pinyin, word.pinyinNumeric, word.primaryMeaningVi, JSON.stringify(word.meaningsVi),
        JSON.stringify(word.meaningsEn), JSON.stringify(word.pos), String(word.hskBand),
        word.source, word.sourceVersion, word.sourceUrl, word.translationStatus, 'search');
      sqlite.prepare('UPDATE vocabulary SET primary_meaning_vi=?,meanings_vi=? WHERE id=?')
        .run('nghĩa tôi tự sửa', '["nghĩa tôi tự sửa"]', word.id);
      const backup = await exportLocalBackup(db, 'test');
      expect(backup.data.baseVocabularyOverrides?.map((row) => row.id)).toContain(word.id);
      sqlite.prepare('UPDATE vocabulary SET primary_meaning_vi=? WHERE id=?').run('bị đổi mất', word.id);
      await importLocalBackup(db, backup);
      expect(sqlite.prepare('SELECT id,primary_meaning_vi FROM vocabulary WHERE id=?').get(word.id))
        .toEqual({ id: word.id, primary_meaning_vi: 'nghĩa tôi tự sửa' });
    } finally { sqlite.close(); }
  });

  it('restores user-owned data without replacing bundled HSK IDs', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.exec(`PRAGMA user_version = ${DATABASE_VERSION}`);
      const backup = await exportLocalBackup(db, 'test');
      sqlite.exec("UPDATE user_vocabulary_progress SET notes='changed' WHERE vocabulary_id='custom-1'");
      await importLocalBackup(db, backup);
      expect(sqlite.prepare("SELECT notes FROM user_vocabulary_progress WHERE vocabulary_id='custom-1'").get())
        .toEqual({ notes: 'Ghi chú không được mất' });
      expect(sqlite.prepare("SELECT id,is_custom FROM vocabulary WHERE id='hsk-1-ni'").get())
        .toEqual({ id: 'hsk-1-ni', is_custom: 0 });
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM review_log').get()).toEqual({ count: 1 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('rolls back every deletion when import has duplicate records', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const backup = await exportLocalBackup(db, 'test');
      backup.data.customVocabulary.push({ ...backup.data.customVocabulary[0] });
      const before = {
        vocabulary: sqlite.prepare('SELECT id,deck_id FROM vocabulary ORDER BY id').all(),
        progress: sqlite.prepare('SELECT vocabulary_id,notes FROM user_vocabulary_progress').all(),
        reviews: sqlite.prepare('SELECT id,vocabulary_id FROM review_log').all(),
        settings: sqlite.prepare('SELECT id,value FROM user_settings').all(),
      };
      await expect(importLocalBackup(db, backup)).rejects.toThrow();
      expect({
        vocabulary: sqlite.prepare('SELECT id,deck_id FROM vocabulary ORDER BY id').all(),
        progress: sqlite.prepare('SELECT vocabulary_id,notes FROM user_vocabulary_progress').all(),
        reviews: sqlite.prepare('SELECT id,vocabulary_id FROM review_log').all(),
        settings: sqlite.prepare('SELECT id,value FROM user_settings').all(),
      }).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
});
