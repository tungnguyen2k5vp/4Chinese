import { describe, expect, it } from 'vitest';

import { initializeDatabase } from './database';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { DATABASE_VERSION } from './schema';

describe('app startup on a legacy release database', { timeout: 15_000 }, () => {
  it('retries corrected lexical staging on a v38 install without changing learner rows or duplicating it', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await initializeDatabase(db);
      const template = sqlite.prepare("SELECT * FROM vocabulary WHERE id='custom-1'").get()!;
      for (const word of [{ id: 'v38-haishi', simplified: '还是', pinyin_numeric: 'hai2 shi5' }, { id: 'v38-zhidao', simplified: '知道', pinyin_numeric: 'zhi1 dao4' }]) {
        const row = { ...template, is_custom: 0, deck_id: null, ...word };
        const columns = Object.keys(row);
        sqlite.prepare(`INSERT INTO vocabulary(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`).run(...Object.values(row));
      }
      const before = sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all();
      for (const id of ['sense-v5-haishi-choice', 'sense-v5-zhidao']) {
        sqlite.prepare('DELETE FROM word_collocations WHERE sense_id=?').run(id);
        sqlite.prepare('DELETE FROM word_sense_examples WHERE sense_id=?').run(id);
        sqlite.prepare('DELETE FROM word_senses WHERE sense_id=?').run(id);
      }
      sqlite.exec('PRAGMA user_version = 38');
      await initializeDatabase(db);
      expect(sqlite.prepare("SELECT sense_id,review_status FROM word_senses WHERE sense_id IN ('sense-v5-haishi-choice','sense-v5-zhidao') ORDER BY sense_id").all())
        .toEqual([{ sense_id: 'sense-v5-haishi-choice', review_status: 'DRAFT' }, { sense_id: 'sense-v5-zhidao', review_status: 'DRAFT' }]);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all()).toEqual(before);
      const count = sqlite.prepare('SELECT COUNT(*) AS n FROM word_senses').get();
      await initializeDatabase(db);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM word_senses').get()).toEqual(count);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
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

  it('adds bundled stories to a v16 install without replacing existing stories or progress', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.prepare(`INSERT INTO stories(id,title,description,hsk_level,difficulty,content,estimated_minutes,created_at)
        VALUES(?,?,?,?,?,?,?,?)`).run('story-school-1', 'Một ngày ở trường', 'Tiểu Minh giới thiệu lớp học của mình.',
        '1', 1, '我叫小明。我是学生。我每天去学校。我的老师很好。我喜欢学中文。', 3, '2026-09-27T00:00:00.000Z');
      sqlite.prepare(`INSERT INTO story_questions(id,story_id,prompt_vi,choices_json,correct_index)
        VALUES(?,?,?,?,?)`).run('story-school-1-q1', 'story-school-1', 'Tiểu Minh làm gì mỗi ngày?',
        JSON.stringify(['Đi học', 'Đi bơi', 'Đi chợ']), 0);
      sqlite.prepare(`INSERT INTO story_progress(story_id,completed_at,best_score,attempts,updated_at)
        VALUES(?,?,?,?,?)`).run('story-school-1', '2026-09-30T10:00:00.000Z', 1, 4, '2026-09-30T10:00:00.000Z');
      sqlite.exec('PRAGMA user_version = 16');

      const beforeStory = sqlite.prepare('SELECT * FROM stories WHERE id=?').get('story-school-1');
      const beforeQuestion = sqlite.prepare('SELECT * FROM story_questions WHERE story_id=?').get('story-school-1');
      const beforeProgress = sqlite.prepare('SELECT * FROM story_progress WHERE story_id=?').get('story-school-1');
      await initializeDatabase(db);

      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM stories').get()).toEqual({ count: 18 });
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM story_questions').get()).toEqual({ count: 18 });
      expect(sqlite.prepare('SELECT * FROM stories WHERE id=?').get('story-school-1')).toEqual(beforeStory);
      expect(sqlite.prepare('SELECT * FROM story_questions WHERE story_id=?').get('story-school-1')).toEqual(beforeQuestion);
      expect(sqlite.prepare('SELECT * FROM story_progress WHERE story_id=?').get('story-school-1')).toEqual(beforeProgress);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
