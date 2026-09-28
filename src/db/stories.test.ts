import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { getStoryQuestions, listStories, recordStoryAnswer, seedStories } from './stories';

describe('graded stories', () => {
  it('seeds idempotently and restores comprehension progress', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await seedStories(db); await seedStories(db);
      expect(await listStories(db)).toHaveLength(3);
      expect(await getStoryQuestions(db, 'story-school-1')).toHaveLength(1);
      await recordStoryAnswer(db, 'story-school-1', true);
      await recordStoryAnswer(db, 'story-school-1', false);
      const backup = await exportLocalBackup(db, 'test');
      sqlite.exec('DELETE FROM story_progress');
      await importLocalBackup(db, backup);
      expect((await listStories(db))[0]).toMatchObject({ best_score: 1, attempts: 2 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
