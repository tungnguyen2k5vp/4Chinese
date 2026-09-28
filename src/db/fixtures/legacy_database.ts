import { DatabaseSync } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

import { migrationSql } from '../schema';

/** A real SQLite v9-shaped database, populated before any new migration runs. */
export function createLegacyDatabase(): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  const legacySchema = migrationSql
    .replace('  candidate_rank INTEGER,\n  exercise_type TEXT\n', '  candidate_rank INTEGER\n')
    .replace(/CREATE TABLE IF NOT EXISTS vocabulary_character_index \([\s\S]*?\);\n\n/, '')
    .replace('CREATE INDEX IF NOT EXISTS idx_vocabulary_character_lookup ON vocabulary_character_index(character, vocabulary_id);\n', '')
    .replace(/CREATE TABLE IF NOT EXISTS image_assets \([\s\S]*?\);\n\n/, '')
    .replace('CREATE INDEX IF NOT EXISTS idx_image_assets_vocabulary ON image_assets(vocabulary_id);\n', '')
    .replace(/CREATE TABLE IF NOT EXISTS (?:courses|units|lessons|lesson_activities|lesson_progress|lesson_activity_progress) \([\s\S]*?\);\n\n/g, '')
    .replace(/CREATE TABLE IF NOT EXISTS (?:grammar_points|sentences|grammar_examples|grammar_vocabulary_links|sentence_vocabulary|sentence_grammar|grammar_progress) \([\s\S]*?\);\n/g, '')
    .replace(/CREATE TABLE IF NOT EXISTS (?:reading_documents|reading_progress|reading_vocabulary) \([\s\S]*?\);\n/g, '')
    .replace(/CREATE TABLE IF NOT EXISTS (?:stories|story_questions|story_progress) \([\s\S]*?\);\n/g, '')
    .replace(/CREATE TABLE IF NOT EXISTS (?:mistake_records|vocabulary_skill_mastery) \([\s\S]*?\);\n/g, '')
    .replace(/CREATE TABLE IF NOT EXISTS speaking_practice \([\s\S]*?\);\n/g, '')
    .replace(/CREATE TABLE IF NOT EXISTS (?:xp_events|achievements|user_achievements|learning_goals|grammar_attempts) \([\s\S]*?\);\n/g, '')
    .replace(/CREATE INDEX IF NOT EXISTS idx_(?:units_course|lessons_unit|lesson_activities_lesson|lesson_activity_progress_completed|grammar_points_hsk|sentences_hsk|sentence_vocab_word|reading_documents_recent|reading_vocabulary_word|stories_level|mistakes_open) ON [^;]+;\n/g, '');
  sqlite.exec(legacySchema);
  sqlite.exec('PRAGMA user_version = 9;');
  sqlite.prepare(`INSERT INTO personal_deck(id,name,color,created_at,updated_at,deleted_at)
    VALUES(?,?,?,?,?,?)`).run('deck-1', 'Bộ từ của tôi', '#2457D6', '2025-01-01', '2025-01-02', null);
  const word = sqlite.prepare(`INSERT INTO vocabulary(
    id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,
    pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  word.run('hsk-1-ni', '你', '你', 'nǐ', 'ni3', 'bạn', '["bạn"]', '["you"]', '["đại từ"]', '1', 'HSK', 'v1', '', 'verified', 'ni3 ban', 0, null);
  word.run('custom-1', '您好', '您好', 'nín hǎo', 'nin2 hao3', 'xin chào', '["xin chào"]', '["hello"]', '["cụm từ"]', '1', 'user', 'v1', '', 'verified', 'nin2 hao3 xin chao', 1, 'deck-1');
  sqlite.prepare(`INSERT INTO example_sentence(id,vocabulary_id,chinese,pinyin,vietnamese)
    VALUES(?,?,?,?,?)`).run('example-1', 'custom-1', '您好！', 'Nín hǎo!', 'Xin chào!');
  sqlite.prepare(`INSERT INTO user_vocabulary_progress(
    vocabulary_id,status,studied,due,next_review_at,state,stability,memory_level,is_favorite,
    is_known,notes,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'custom-1', 'LEARNING', 1, '2025-01-06T00:00:00Z', '2025-01-06T00:00:00Z',
    2, 7.5, 4, 1, 0, 'Ghi chú không được mất', '2025-01-01', '2025-01-02',
  );
  sqlite.prepare(`INSERT INTO review_log(vocabulary_id,reviewed_at,rating,previous_state,new_state,response_time_ms,mode)
    VALUES(?,?,?,?,?,?,?)`).run('custom-1', '2025-01-02', 3, 1, 2, 1200, 'hanzi-meaning');
  sqlite.prepare(`INSERT INTO daily_stats(date,reviewed,correct,new_words,study_seconds)
    VALUES(?,?,?,?,?)`).run('2025-01-02', 8, 7, 2, 900);
  sqlite.prepare(`INSERT INTO user_settings(id,value,updated_at)
    VALUES(?,?,?)`).run(1, '{"dailyNewWordGoal":20}', '2025-01-02');
  return sqlite;
}

/** Minimal v1 release shape, before personal decks and memory-level columns. */
export function createV1Database(): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE vocabulary (
      id TEXT PRIMARY KEY NOT NULL, simplified TEXT NOT NULL, traditional TEXT NOT NULL,
      pinyin TEXT NOT NULL, pinyin_numeric TEXT NOT NULL, primary_meaning_vi TEXT NOT NULL,
      meanings_vi TEXT NOT NULL, meanings_en TEXT NOT NULL, pos TEXT NOT NULL,
      hsk_band TEXT NOT NULL, frequency_rank INTEGER, classifiers TEXT NOT NULL DEFAULT '[]',
      radical TEXT, stroke_count INTEGER, visual_type TEXT NOT NULL DEFAULT 'none',
      image_uri TEXT, image_source TEXT, image_license TEXT, image_attribution TEXT,
      audio_uri TEXT, source TEXT NOT NULL, source_version TEXT NOT NULL,
      source_url TEXT NOT NULL, translation_status TEXT NOT NULL, search_text TEXT NOT NULL
    );
    CREATE TABLE example_sentence (
      id TEXT PRIMARY KEY NOT NULL, vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
      chinese TEXT NOT NULL, pinyin TEXT NOT NULL, vietnamese TEXT NOT NULL,
      english TEXT, difficulty INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE user_vocabulary_progress (
      vocabulary_id TEXT PRIMARY KEY NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
      state INTEGER NOT NULL DEFAULT 0, due TEXT NOT NULL, stability REAL NOT NULL DEFAULT 0,
      difficulty REAL NOT NULL DEFAULT 0, elapsed_days INTEGER NOT NULL DEFAULT 0,
      scheduled_days INTEGER NOT NULL DEFAULT 0, learning_steps INTEGER NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0, last_review TEXT,
      mastery_level INTEGER NOT NULL DEFAULT 0, is_known INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0, is_suspended INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE review_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
      reviewed_at TEXT NOT NULL, rating INTEGER NOT NULL, previous_state INTEGER NOT NULL,
      new_state INTEGER NOT NULL, response_time_ms INTEGER NOT NULL, mode TEXT NOT NULL
    );
    CREATE TABLE daily_stats (
      date TEXT PRIMARY KEY NOT NULL, reviewed INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0, new_words INTEGER NOT NULL DEFAULT 0,
      study_seconds INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE user_settings (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL, updated_at TEXT NOT NULL);
    PRAGMA user_version = 1;
  `);
  sqlite.prepare(`INSERT INTO vocabulary(
    id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,
    pos,hsk_band,source,source_version,source_url,translation_status,search_text
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'hsk-1-ni', '你', '你', 'nǐ', 'ni3', 'bạn', '["bạn"]', '["you"]', '["đại từ"]',
    '1', 'HSK', 'v1', '', 'verified', 'ni3 ban',
  );
  sqlite.prepare(`INSERT INTO user_vocabulary_progress(
    vocabulary_id,state,due,stability,reps,lapses,is_favorite,notes,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
    'hsk-1-ni', 2, '2025-01-06T00:00:00Z', 7.5, 3, 1, 1,
    'Ghi chú bản v1', '2025-01-01', '2025-01-02',
  );
  sqlite.prepare(`INSERT INTO review_log(vocabulary_id,reviewed_at,rating,previous_state,new_state,response_time_ms,mode)
    VALUES(?,?,?,?,?,?,?)`).run('hsk-1-ni', '2025-01-02', 3, 1, 2, 1200, 'hanzi-meaning');
  sqlite.prepare(`INSERT INTO daily_stats(date,reviewed,correct,new_words,study_seconds)
    VALUES(?,?,?,?,?)`).run('2025-01-02', 8, 7, 2, 900);
  sqlite.prepare(`INSERT INTO user_settings(id,value,updated_at)
    VALUES(?,?,?)`).run(1, '{"dailyNewWordGoal":20}', '2025-01-02');
  return sqlite;
}

/** Minimal Expo SQLite adapter; SQL is executed by actual SQLite, not a mock parser. */
export function expoAdapter(sqlite: DatabaseSync): SQLiteDatabase {
  const parameters = (values: unknown[]): (string | number | null)[] =>
    (values.length === 1 && Array.isArray(values[0]) ? values[0] : values) as (string | number | null)[];
  const adapter = {
    execAsync: async (sql: string) => { sqlite.exec(sql); },
    getAllAsync: async <T>(sql: string, ...values: unknown[]) =>
      sqlite.prepare(sql).all(...parameters(values)) as T[],
    getFirstAsync: async <T>(sql: string, ...values: unknown[]) =>
      (sqlite.prepare(sql).get(...parameters(values)) ?? null) as T | null,
    runAsync: async (sql: string, ...values: unknown[]) => sqlite.prepare(sql).run(...parameters(values)),
    prepareAsync: async (sql: string) => {
      const statement = sqlite.prepare(sql);
      return {
        executeAsync: async (...args: unknown[]) => {
          const values = args[0];
          if (Array.isArray(values)) return statement.run(...(values as (string | number | null)[]));
          if (typeof values === 'object' && values !== null) return statement.run(values as Record<string, string | number | null>);
          return statement.run(...(args as (string | number | null)[]));
        },
        finalizeAsync: async () => {},
      };
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      sqlite.exec('BEGIN TRANSACTION');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return adapter as unknown as SQLiteDatabase;
}
