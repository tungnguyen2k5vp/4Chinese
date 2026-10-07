import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, createV1Database, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { DATABASE_VERSION } from './schema';

import bundledHsk from '@/data/hsk-vocabulary.json';

type Snapshot = Record<string, unknown[]>;

function snapshotUserData(sqlite: ReturnType<typeof createLegacyDatabase>): Snapshot {
  const tables: Record<string, string> = {
    personal_deck: 'id,name,color,created_at,updated_at,deleted_at',
    vocabulary: 'id,simplified,traditional,pinyin,primary_meaning_vi,meanings_vi,meanings_en,is_custom,deck_id',
    example_sentence: 'id,vocabulary_id,chinese,pinyin,vietnamese',
    user_vocabulary_progress: 'vocabulary_id,status,studied,due,next_review_at,state,stability,memory_level,is_favorite,is_known,notes',
    review_log: 'id,vocabulary_id,reviewed_at,rating,previous_state,new_state,response_time_ms,mode',
    daily_stats: 'date,reviewed,correct,new_words,study_seconds',
    user_settings: 'id,value,updated_at',
  };
  return Object.fromEntries(Object.entries(tables).map(([table, columns]) => [
    table, sqlite.prepare(`SELECT ${columns} FROM ${table} ORDER BY 1`).all(),
  ]));
}

function assertNoUserDataLoss(sqlite: ReturnType<typeof createLegacyDatabase>, before: Snapshot): void {
  expect(snapshotUserData(sqlite)).toEqual(before);
  expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
}

describe('real SQLite legacy release upgrade', () => {
  it('keeps the merged HSK IDs unique and preserves the legacy set', () => {
    expect(bundledHsk).toHaveLength(11828);
    expect(new Set(bundledHsk.map((word) => word.id)).size).toBe(11828);
    expect(bundledHsk.filter((word) => word.hskBand === 1)).toHaveLength(508);
    expect(bundledHsk.filter((word) => word.hskBand === 2)).toHaveLength(751);
    expect(bundledHsk.filter((word) => word.hskBand === 3)).toHaveLength(963);
    expect(bundledHsk.filter((word) => word.hskBand === 4)).toHaveLength(987);
  });

  it('creates a fresh schema without relying on old ALTER statements', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      expect(await migrateDatabaseSchema(expoAdapter(sqlite))).toBe(0);
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM vocabulary').get()).toEqual({ count: 0 });
      expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    } finally {
      sqlite.close();
    }
  });

  it('repairs a partially applied v2 without overwriting existing mastery', async () => {
    const sqlite = createV1Database();
    try {
      sqlite.exec('ALTER TABLE user_vocabulary_progress ADD COLUMN memory_level INTEGER NOT NULL DEFAULT 0;');
      sqlite.exec('UPDATE user_vocabulary_progress SET memory_level = 5;');
      expect(await migrateDatabaseSchema(expoAdapter(sqlite))).toBe(1);
      expect(sqlite.prepare('SELECT memory_level,next_review_at,status,notes FROM user_vocabulary_progress').get())
        .toEqual({ memory_level: 5, next_review_at: '2025-01-06T00:00:00Z', status: 'LEARNING', notes: 'Ghi chú bản v1' });
    } finally {
      sqlite.close();
    }
  });

  it('opens v1 progress and preserves its SRS schedule, notes and history', async () => {
    const sqlite = createV1Database();
    try {
      const original = sqlite.prepare(`SELECT vocabulary_id,state,due,stability,reps,lapses,is_favorite,notes
        FROM user_vocabulary_progress`).get();
      expect(await migrateDatabaseSchema(expoAdapter(sqlite))).toBe(1);
      expect(sqlite.prepare(`SELECT vocabulary_id,state,due,stability,reps,lapses,is_favorite,notes
        FROM user_vocabulary_progress`).get()).toEqual(original);
      expect(sqlite.prepare(`SELECT next_review_at,status,studied,memory_level FROM user_vocabulary_progress`).get())
        .toEqual({ next_review_at: '2025-01-06T00:00:00Z', status: 'LEARNING', studied: 1, memory_level: 4 });
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM review_log').get()).toEqual({ count: 1 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('adds missing schema without changing HSK IDs or learner data, and reruns safely', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const before = snapshotUserData(sqlite);
      const db = expoAdapter(sqlite);
      expect(await migrateDatabaseSchema(db)).toBe(9);
      assertNoUserDataLoss(sqlite, before);
      expect(sqlite.prepare('PRAGMA table_info(review_log)').all()).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'exercise_type' })]),
      );
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM vocabulary_character_index').get()).toEqual({ count: 0 });
      // The caller marks the version only after all data refreshes succeed.
      sqlite.exec(`PRAGMA user_version = ${DATABASE_VERSION}`);
      expect(await migrateDatabaseSchema(db)).toBe(DATABASE_VERSION);
      assertNoUserDataLoss(sqlite, before);
    } finally {
      sqlite.close();
    }
  });

  it('rolls every schema change back when an index fails', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const before = snapshotUserData(sqlite);
      const db = expoAdapter(sqlite);
      const original = db.execAsync.bind(db);
      db.execAsync = async (sql: string) => {
        if (sql.includes('idx_reviews_exercise_type')) throw new Error('SIMULATED_INDEX_FAILURE');
        return original(sql);
      };
      await expect(migrateDatabaseSchema(db)).rejects.toThrow('SIMULATED_INDEX_FAILURE');
      assertNoUserDataLoss(sqlite, before);
      expect(sqlite.prepare('PRAGMA user_version').get()).toEqual({ user_version: 9 });
      expect(sqlite.prepare('PRAGMA table_info(review_log)').all()).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'exercise_type' })]),
      );
    } finally {
      sqlite.close();
    }
  });

  it('refuses a database written by a newer app before mutating it', async () => {
    const sqlite = createLegacyDatabase();
    try {
      sqlite.exec(`PRAGMA user_version = ${DATABASE_VERSION + 1}`);
      const before = snapshotUserData(sqlite);
      await expect(migrateDatabaseSchema(expoAdapter(sqlite))).rejects.toThrow('UNSUPPORTED_DATABASE_VERSION');
      assertNoUserDataLoss(sqlite, before);
    } finally {
      sqlite.close();
    }
  });
});
