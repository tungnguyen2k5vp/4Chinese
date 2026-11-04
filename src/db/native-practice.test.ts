import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { listNativePractice, parseNativePracticeResult, recordNativePractice } from './native-practice';

import { parseLocalBackup } from '@/services/backup/format';

describe('native handwriting result persistence', () => {
  it('upgrades v46, records/replays once, rejects conflicts and preserves SRS', async () => {
    const sqlite = createLegacyDatabase();
    const db = expoAdapter(sqlite);
    try {
      await migrateDatabaseSchema(db);
      sqlite.exec('DROP TABLE native_handwriting_practice; PRAGMA user_version=46;');
      const progress = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      const reviews = sqlite.prepare('SELECT * FROM review_log').all();
      await migrateDatabaseSchema(db);
      const result = { id:'12345678-1234-1234-1234-123456789abc', target:'请', candidate:'请', strokeCount:10, completedAtMs:Date.parse('2026-11-03T05:00:00Z') };
      await recordNativePractice(db, result);
      await recordNativePractice(db, result);
      expect(await listNativePractice(db, '请')).toHaveLength(1);
      await expect(recordNativePractice(db, { ...result, candidate:'青' })).rejects.toThrow('CONFLICT');
      for (const bad of [{ ...result, strokeCount:0 }, { ...result, completedAtMs:NaN }, { ...result, candidate:'a\nb' }, { ...result, id:'bad' }]) {
        expect(() => parseNativePracticeResult(bad)).toThrow();
      }
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(progress);
      expect(sqlite.prepare('SELECT * FROM review_log').all()).toEqual(reviews);
      await migrateDatabaseSchema(db);
      expect(await listNativePractice(db, '请')).toHaveLength(1);
    } finally { sqlite.close(); }
  });

  it('round-trips metadata in backup and preserves history when restoring an older backup', async () => {
    const sqlite = createLegacyDatabase();
    const db = expoAdapter(sqlite);
    try {
      await migrateDatabaseSchema(db);
      await recordNativePractice(db, { id:'12345678-1234-1234-1234-123456789abc', target:'人', candidate:'人', strokeCount:2, completedAtMs:Date.parse('2026-11-03T05:00:00Z') });
      const backup = parseLocalBackup(JSON.stringify(await exportLocalBackup(db, 'check')));
      expect(backup.data.nativeHandwritingPractice).toHaveLength(1);
      sqlite.exec('DELETE FROM native_handwriting_practice;');
      await importLocalBackup(db, backup);
      expect(await listNativePractice(db, '人')).toHaveLength(1);
      delete backup.data.nativeHandwritingPractice;
      await importLocalBackup(db, backup);
      expect(await listNativePractice(db, '人')).toHaveLength(1);
      const invalid = JSON.parse(JSON.stringify(await exportLocalBackup(db, 'check')));
      invalid.data.nativeHandwritingPractice[0].stroke_count = -1;
      expect(() => parseLocalBackup(JSON.stringify(invalid))).toThrow();
      await expect(importLocalBackup(db, invalid)).rejects.toThrow();
      expect(await listNativePractice(db, '人')).toHaveLength(1);
    } finally { sqlite.close(); }
  });
});
