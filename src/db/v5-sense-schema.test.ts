import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { DATABASE_VERSION } from './schema';

describe('V5.1 word sense metadata migration', () => {
  it('adds frequency ordering without rekeying existing composite senses', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.exec(`INSERT INTO word_senses(vocabulary_id,sense_id,part_of_speech,definition_vi,pinyin_numeric,source_ref)
        VALUES('custom-1','primary','động từ','nghĩa chính','xing2','fixture')`);
      sqlite.exec('PRAGMA user_version=41');
      await migrateDatabaseSchema(db);
      expect(sqlite.prepare('SELECT vocabulary_id,sense_id,frequency_order FROM word_senses').all()).toEqual([
        { vocabulary_id: 'custom-1', sense_id: 'primary', frequency_order: null },
      ]);
      expect(sqlite.prepare('PRAGMA user_version').get()).toEqual({ user_version: 41 });
      expect(DATABASE_VERSION).toBe(43);
      expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    } finally {
      sqlite.close();
    }
  });
});

