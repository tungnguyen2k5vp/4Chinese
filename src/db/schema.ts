export const DATABASE_VERSION = 7;

export const migrationSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS personal_deck (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2457D6',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS vocabulary (
  id TEXT PRIMARY KEY NOT NULL,
  simplified TEXT NOT NULL,
  traditional TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  pinyin_numeric TEXT NOT NULL,
  primary_meaning_vi TEXT NOT NULL,
  meanings_vi TEXT NOT NULL,
  meanings_en TEXT NOT NULL,
  pos TEXT NOT NULL,
  hsk_band TEXT NOT NULL,
  frequency_rank INTEGER,
  classifiers TEXT NOT NULL DEFAULT '[]',
  radical TEXT,
  stroke_count INTEGER,
  visual_type TEXT NOT NULL DEFAULT 'none',
  image_uri TEXT,
  image_source TEXT,
  image_license TEXT,
  image_attribution TEXT,
  audio_uri TEXT,
  source TEXT NOT NULL,
  source_version TEXT NOT NULL,
  source_url TEXT NOT NULL,
  translation_status TEXT NOT NULL,
  search_text TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  deck_id TEXT REFERENCES personal_deck(id) ON DELETE SET NULL,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS example_sentence (
  id TEXT PRIMARY KEY NOT NULL,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  chinese TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  vietnamese TEXT NOT NULL,
  english TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
  vocabulary_id TEXT PRIMARY KEY NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  state INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NEW',
  studied INTEGER NOT NULL DEFAULT 0,
  due TEXT NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsed_days INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_review TEXT,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  is_known INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  memory_level INTEGER NOT NULL DEFAULT 0,
  deep_memory_stage INTEGER NOT NULL DEFAULT 0,
  learned_at TEXT,
  next_review_at TEXT NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  lapse_count INTEGER NOT NULL DEFAULT 0,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  consecutive_wrong INTEGER NOT NULL DEFAULT 0,
  hint_used_count INTEGER NOT NULL DEFAULT 0,
  average_response_time_ms INTEGER NOT NULL DEFAULT 0,
  last_response_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  rating INTEGER NOT NULL,
  previous_state INTEGER NOT NULL,
  new_state INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  mode TEXT NOT NULL,
  level_before INTEGER,
  level_after INTEGER,
  deep_stage_before INTEGER,
  deep_stage_after INTEGER,
  correct INTEGER,
  hint_used INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  typed_pinyin TEXT,
  selected_hanzi TEXT,
  candidate_rank INTEGER
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  new_words INTEGER NOT NULL DEFAULT 0,
  study_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_hsk ON vocabulary(hsk_band);
CREATE INDEX IF NOT EXISTS idx_vocabulary_pinyin ON vocabulary(pinyin_numeric);
CREATE INDEX IF NOT EXISTS idx_vocabulary_pinyin_compact ON vocabulary(
  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(pinyin_numeric,'1',''),'2',''),'3',''),'4',''),'5',''),' ',''),'ü','v'))
);
CREATE INDEX IF NOT EXISTS idx_vocabulary_frequency ON vocabulary(frequency_rank);
CREATE INDEX IF NOT EXISTS idx_progress_due ON user_vocabulary_progress(due, state, is_suspended);
CREATE INDEX IF NOT EXISTS idx_examples_vocabulary ON example_sentence(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vocabulary ON review_log(vocabulary_id, reviewed_at);
`;

export const migrationV2Sql = `
CREATE TABLE IF NOT EXISTS personal_deck (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2457D6',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
ALTER TABLE vocabulary ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vocabulary ADD COLUMN deck_id TEXT;
ALTER TABLE vocabulary ADD COLUMN created_at TEXT;
ALTER TABLE vocabulary ADD COLUMN updated_at TEXT;
ALTER TABLE user_vocabulary_progress ADD COLUMN memory_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN deep_memory_stage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN learned_at TEXT;
ALTER TABLE user_vocabulary_progress ADD COLUMN next_review_at TEXT;
ALTER TABLE user_vocabulary_progress ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN wrong_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN lapse_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN consecutive_correct INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN consecutive_wrong INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN hint_used_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN average_response_time_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_vocabulary_progress ADD COLUMN last_response_time_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE review_log ADD COLUMN level_before INTEGER;
ALTER TABLE review_log ADD COLUMN level_after INTEGER;
ALTER TABLE review_log ADD COLUMN deep_stage_before INTEGER;
ALTER TABLE review_log ADD COLUMN deep_stage_after INTEGER;
ALTER TABLE review_log ADD COLUMN correct INTEGER;
ALTER TABLE review_log ADD COLUMN hint_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE review_log ADD COLUMN next_review_at TEXT;
UPDATE user_vocabulary_progress SET
  memory_level = CASE
    WHEN state = 0 THEN 0
    WHEN state IN (1, 3) THEN CASE WHEN reps <= 1 THEN 1 ELSE 2 END
    WHEN stability < 3 THEN 3
    WHEN stability < 14 THEN 4
    WHEN stability < 45 THEN 5
    ELSE 6 END,
  deep_memory_stage = CASE WHEN stability >= 180 THEN 4 WHEN stability >= 120 THEN 3 WHEN stability >= 60 THEN 2 WHEN stability >= 30 THEN 1 ELSE 0 END,
  learned_at = CASE WHEN state > 0 THEN COALESCE(last_review, created_at) ELSE NULL END,
  next_review_at = due,
  review_count = reps,
  correct_count = MAX(0, reps - lapses),
  wrong_count = lapses,
  lapse_count = lapses;
`;

/**
 * Adds soft-delete support for personal decks. The deck and all of its words
 * stay in SQLite while deleted_at is set, so a user can restore the deck
 * without losing progress or review history.
 */
export const migrationV3Sql = `
ALTER TABLE personal_deck ADD COLUMN deleted_at TEXT;
`;

/**
 * Separates the user's vocabulary lifecycle from the legacy FSRS state integer.
 * Existing rows are migrated conservatively: known words remain KNOWN (with no
 * memory level), words that have a memory level become LEARNING, and untouched
 * rows remain NEW. Skipped is intentionally never inferred from legacy data.
 */
export const migrationV4Sql = `
ALTER TABLE user_vocabulary_progress ADD COLUMN status TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE user_vocabulary_progress ADD COLUMN studied INTEGER NOT NULL DEFAULT 0;
UPDATE user_vocabulary_progress SET
  status = CASE
    WHEN is_known = 1 THEN 'KNOWN'
    WHEN memory_level > 0 OR state IN (1, 2, 3) THEN 'LEARNING'
    ELSE 'NEW'
  END,
  studied = CASE
    WHEN is_known = 1 OR memory_level > 0 OR state IN (1, 2, 3) THEN 1
    ELSE 0
  END,
  memory_level = CASE WHEN is_known = 1 THEN 0 ELSE memory_level END,
  mastery_level = CASE WHEN is_known = 1 THEN 0 ELSE memory_level END,
  next_review_at = COALESCE(next_review_at, due, CURRENT_TIMESTAMP),
  is_known = CASE WHEN is_known = 1 THEN 1 ELSE 0 END;
`;

/** Stores answer telemetry for the pinyin-to-Hanzi compose review mode. */
export const migrationV5Sql = `
ALTER TABLE review_log ADD COLUMN typed_pinyin TEXT;
ALTER TABLE review_log ADD COLUMN selected_hanzi TEXT;
ALTER TABLE review_log ADD COLUMN candidate_rank INTEGER;
`;

export const latestIndexSql = `
CREATE INDEX IF NOT EXISTS idx_progress_next_review ON user_vocabulary_progress(next_review_at, memory_level, is_suspended);
CREATE INDEX IF NOT EXISTS idx_vocabulary_deck ON vocabulary(deck_id, is_custom);
CREATE INDEX IF NOT EXISTS idx_personal_deck_deleted ON personal_deck(deleted_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_progress_status_due ON user_vocabulary_progress(status, studied, next_review_at, is_suspended);
CREATE INDEX IF NOT EXISTS idx_reviews_mode ON review_log(mode, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_pinyin_compact ON vocabulary(
  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(pinyin_numeric,'1',''),'2',''),'3',''),'4',''),'5',''),' ',''),'ü','v'))
);
`;

export function isValidMigrationVersion(version: number): boolean {
  return Number.isInteger(version) && version >= 0 && version <= DATABASE_VERSION;
}
