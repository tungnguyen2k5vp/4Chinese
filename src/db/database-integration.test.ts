import { describe, expect, it } from 'vitest';

import { initializeDatabase } from './database';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { DATABASE_VERSION } from './schema';

describe('app startup on a legacy release database', () => {
  it('completes schema and dictionary initialization without losing learner data', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      const before = {
        custom: sqlite.prepare("SELECT id,deck_id,meanings_vi FROM vocabulary WHERE is_custom=1").get(),
        progress: sqlite.prepare('SELECT vocabulary_id,status,memory_level,next_review_at,notes,is_favorite FROM user_vocabulary_progress').get(),
        history: sqlite.prepare('SELECT vocabulary_id,rating,reviewed_at FROM review_log').get(),
        stats: sqlite.prepare('SELECT date,reviewed,study_seconds FROM daily_stats').get(),
        settings: sqlite.prepare('SELECT value FROM user_settings').get(),
      };
      await initializeDatabase(db);
      expect(sqlite.prepare('PRAGMA user_version').get()).toEqual({ user_version: DATABASE_VERSION });
      const after = {
        custom: sqlite.prepare("SELECT id,deck_id,meanings_vi FROM vocabulary WHERE is_custom=1").get(),
        progress: sqlite.prepare('SELECT vocabulary_id,status,memory_level,next_review_at,notes,is_favorite FROM user_vocabulary_progress').get(),
        history: sqlite.prepare('SELECT vocabulary_id,rating,reviewed_at FROM review_log').get(),
        stats: sqlite.prepare('SELECT date,reviewed,study_seconds FROM daily_stats').get(),
        settings: sqlite.prepare('SELECT value FROM user_settings').get(),
      };
      expect(after).toEqual(before);
      expect(sqlite.prepare("SELECT id FROM vocabulary WHERE id='hsk-1-ni'").get()).toEqual({ id: 'hsk-1-ni' });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      await initializeDatabase(db);
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM vocabulary WHERE id='custom-1'").get()).toEqual({ count: 1 });
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM review_log').get()).toEqual({ count: 1 });
    } finally {
      sqlite.close();
    }
  });
});
