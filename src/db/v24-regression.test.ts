import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import {
  DATABASE_VERSION,
  migrationSql,
  migrationV21Sql,
  migrationV22Sql,
  migrationV23Sql,
  migrationV24Sql,
} from './schema';

function createProductionV24Fixture(): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migrationSql);
  sqlite.exec(migrationV21Sql);
  sqlite.exec(migrationV22Sql);
  sqlite.exec(migrationV23Sql);
  sqlite.exec(migrationV24Sql);
  sqlite.exec(`
    PRAGMA user_version = 24;
    INSERT INTO personal_deck(id,name,color,created_at,updated_at,deleted_at)
      VALUES('deck-v24','Bộ từ cần giữ','#2457D6','2026-09-01','2026-09-02',NULL);
    INSERT INTO user_settings(id,value,updated_at)
      VALUES(1,'{"dailyNewWordGoal":15}','2026-09-02');
    INSERT INTO sync_outbox(id,account_id,entity_type,entity_id,operation,payload_json,state,attempt_count,next_retry_at,created_at,updated_at)
      VALUES('sync-v24','11111111-1111-1111-1111-111111111111','DECK','deck-v24','UPSERT','{"updatedAt":"2026-09-02T00:00:00.000Z"}','RETRY',2,'2026-09-03','2026-09-02','2026-09-02');
  `);
  return sqlite;
}

describe('production v24 regression fixture', () => {
  it('upgrades v24 to v25 additively without losing learner data or pending sync work', async () => {
    const sqlite = createProductionV24Fixture();
    try {
      const before = {
        deck: sqlite.prepare('SELECT * FROM personal_deck').all(),
        settings: sqlite.prepare('SELECT * FROM user_settings').all(),
        outbox: sqlite.prepare('SELECT id,account_id,entity_type,entity_id,operation,payload_json,state,attempt_count,next_retry_at,created_at,updated_at FROM sync_outbox').all(),
      };
      expect(await migrateDatabaseSchema(expoAdapter(sqlite))).toBe(24);
      expect(sqlite.prepare('PRAGMA table_info(sync_outbox)').all()).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'last_error' }),
        expect.objectContaining({ name: 'last_attempt_at' }),
      ]));
      expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_cursor'").get())
        .toEqual({ name: 'sync_cursor' });
      expect({
        deck: sqlite.prepare('SELECT * FROM personal_deck').all(),
        settings: sqlite.prepare('SELECT * FROM user_settings').all(),
        outbox: sqlite.prepare('SELECT id,account_id,entity_type,entity_id,operation,payload_json,state,attempt_count,next_retry_at,created_at,updated_at FROM sync_outbox').all(),
      }).toEqual(before);
      sqlite.exec(`PRAGMA user_version = ${DATABASE_VERSION}`);
      await migrateDatabaseSchema(expoAdapter(sqlite));
      expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
