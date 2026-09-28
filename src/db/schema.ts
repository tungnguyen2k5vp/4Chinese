export const DATABASE_VERSION = 20;

export const migrationV20Sql = `
CREATE TABLE IF NOT EXISTS lesson_activity_progress (
  activity_id TEXT PRIMARY KEY NOT NULL REFERENCES lesson_activities(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lesson_activity_progress_completed
  ON lesson_activity_progress(completed_at);
`;

export const migrationV19Sql = `
CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY NOT NULL, activity TEXT NOT NULL,
  entity_id TEXT NOT NULL, points INTEGER NOT NULL CHECK(points > 0 AND points <= 100),
  local_date TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, metric TEXT NOT NULL,
  threshold INTEGER NOT NULL CHECK(threshold > 0)
);
CREATE TABLE IF NOT EXISTS user_achievements (
  achievement_id TEXT PRIMARY KEY NOT NULL REFERENCES achievements(id),
  unlocked_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS learning_goals (
  id INTEGER PRIMARY KEY CHECK(id=1), weekly_minutes INTEGER NOT NULL CHECK(weekly_minutes BETWEEN 30 AND 2100),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS grammar_attempts (
  id TEXT PRIMARY KEY NOT NULL, grammar_id TEXT NOT NULL REFERENCES grammar_points(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL, correct INTEGER NOT NULL CHECK(correct IN (0,1)), created_at TEXT NOT NULL
);
`;

export const migrationV18Sql = `
CREATE TABLE IF NOT EXISTS speaking_practice (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('tone','shadowing')),
  vocabulary_id TEXT REFERENCES vocabulary(id) ON DELETE CASCADE,
  sentence_id TEXT REFERENCES sentences(id) ON DELETE CASCADE,
  correct INTEGER CHECK(correct IS NULL OR correct IN (0,1)),
  created_at TEXT NOT NULL,
  CHECK((kind='tone' AND vocabulary_id IS NOT NULL AND correct IS NOT NULL) OR
        (kind='shadowing' AND sentence_id IS NOT NULL AND correct IS NULL))
);
`;

export const migrationV17Sql = `
CREATE TABLE IF NOT EXISTS mistake_records (
  id TEXT PRIMARY KEY NOT NULL,
  vocabulary_id TEXT REFERENCES vocabulary(id) ON DELETE CASCADE,
  sentence_id TEXT REFERENCES sentences(id) ON DELETE CASCADE,
  grammar_id TEXT REFERENCES grammar_points(id) ON DELETE CASCADE,
  skill_type TEXT NOT NULL, exercise_type TEXT NOT NULL,
  wrong_count INTEGER NOT NULL DEFAULT 0, correct_streak INTEGER NOT NULL DEFAULT 0,
  last_wrong_at TEXT, last_correct_at TEXT, resolved INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vocabulary_skill_mastery (
  vocabulary_id TEXT PRIMARY KEY NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  meaning_score INTEGER NOT NULL DEFAULT 0, recognition_score INTEGER NOT NULL DEFAULT 0,
  pinyin_score INTEGER NOT NULL DEFAULT 0, listening_score INTEGER NOT NULL DEFAULT 0,
  writing_score INTEGER NOT NULL DEFAULT 0, speaking_score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
`;

export const migrationV16Sql = `
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
  hsk_level TEXT NOT NULL, difficulty INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL, estimated_minutes INTEGER NOT NULL DEFAULT 5,
  audio_uri TEXT, cover_uri TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS story_questions (
  id TEXT PRIMARY KEY NOT NULL, story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  prompt_vi TEXT NOT NULL, choices_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS story_progress (
  story_id TEXT PRIMARY KEY NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  completed_at TEXT, best_score INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
`;

export const migrationV15Sql = `
CREATE TABLE IF NOT EXISTS reading_documents (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS reading_progress (
  document_id TEXT PRIMARY KEY NOT NULL REFERENCES reading_documents(id) ON DELETE CASCADE,
  last_token_index INTEGER NOT NULL DEFAULT 0, coverage_percent INTEGER NOT NULL DEFAULT 0,
  last_read_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reading_vocabulary (
  document_id TEXT NOT NULL REFERENCES reading_documents(id) ON DELETE CASCADE,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  occurrences INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(document_id,vocabulary_id)
);
`;

/** Shared content graph: sentences are stored once and linked to grammar/vocabulary. */
export const migrationV14Sql = `
CREATE TABLE IF NOT EXISTS grammar_points (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, pattern TEXT NOT NULL,
  explanation_vi TEXT NOT NULL, explanation_en TEXT,
  hsk_level TEXT NOT NULL, difficulty INTEGER NOT NULL DEFAULT 1,
  notes TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sentences (
  id TEXT PRIMARY KEY NOT NULL, hanzi TEXT NOT NULL, pinyin TEXT NOT NULL,
  translation_vi TEXT NOT NULL, translation_en TEXT,
  hsk_level TEXT, difficulty INTEGER NOT NULL DEFAULT 1, topic TEXT,
  audio_uri TEXT, source TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS grammar_examples (
  grammar_id TEXT NOT NULL REFERENCES grammar_points(id) ON DELETE CASCADE,
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(grammar_id,sentence_id)
);
CREATE TABLE IF NOT EXISTS grammar_vocabulary_links (
  grammar_id TEXT NOT NULL REFERENCES grammar_points(id) ON DELETE CASCADE,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  PRIMARY KEY(grammar_id,vocabulary_id)
);
CREATE TABLE IF NOT EXISTS sentence_vocabulary (
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(sentence_id,vocabulary_id,position)
);
CREATE TABLE IF NOT EXISTS sentence_grammar (
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  grammar_id TEXT NOT NULL REFERENCES grammar_points(id) ON DELETE CASCADE,
  PRIMARY KEY(sentence_id,grammar_id)
);
CREATE TABLE IF NOT EXISTS grammar_progress (
  grammar_id TEXT PRIMARY KEY NOT NULL REFERENCES grammar_points(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TEXT, updated_at TEXT NOT NULL
);
`;

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

CREATE TABLE IF NOT EXISTS vocabulary_character_index (
  character TEXT NOT NULL,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  PRIMARY KEY(character, vocabulary_id)
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
  candidate_rank INTEGER,
  exercise_type TEXT
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

CREATE TABLE IF NOT EXISTS image_assets (
  id TEXT PRIMARY KEY NOT NULL,
  vocabulary_id TEXT NOT NULL UNIQUE REFERENCES vocabulary(id) ON DELETE CASCADE,
  local_uri TEXT NOT NULL,
  cloud_url TEXT,
  mime_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  checksum TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  hsk_band TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY NOT NULL,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY NOT NULL,
  unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 10,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lesson_activities (
  id TEXT PRIMARY KEY NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK(activity_type IN ('VOCABULARY','GRAMMAR','LISTENING','SPEAKING','READING','HANZI','QUIZ')),
  title TEXT NOT NULL,
  target TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  lesson_id TEXT PRIMARY KEY NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

${migrationV14Sql}
${migrationV15Sql}
${migrationV16Sql}
${migrationV17Sql}
${migrationV18Sql}
${migrationV19Sql}
${migrationV20Sql}

CREATE INDEX IF NOT EXISTS idx_vocabulary_hsk ON vocabulary(hsk_band);
CREATE INDEX IF NOT EXISTS idx_vocabulary_pinyin ON vocabulary(pinyin_numeric);
CREATE INDEX IF NOT EXISTS idx_vocabulary_simplified ON vocabulary(simplified);
CREATE INDEX IF NOT EXISTS idx_vocabulary_traditional ON vocabulary(traditional);
CREATE INDEX IF NOT EXISTS idx_vocabulary_pinyin_compact ON vocabulary(
  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(pinyin_numeric,'1',''),'2',''),'3',''),'4',''),'5',''),' ',''),'ü','v'))
);
CREATE INDEX IF NOT EXISTS idx_vocabulary_frequency ON vocabulary(frequency_rank);
CREATE INDEX IF NOT EXISTS idx_progress_due ON user_vocabulary_progress(due, state, is_suspended);
CREATE INDEX IF NOT EXISTS idx_examples_vocabulary ON example_sentence(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_character_lookup ON vocabulary_character_index(character, vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vocabulary ON review_log(vocabulary_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_image_assets_vocabulary ON image_assets(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_activities_lesson ON lesson_activities(lesson_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_activity_progress_completed ON lesson_activity_progress(completed_at);
CREATE INDEX IF NOT EXISTS idx_grammar_points_hsk ON grammar_points(hsk_level,difficulty);
CREATE INDEX IF NOT EXISTS idx_sentences_hsk ON sentences(hsk_level,difficulty);
CREATE INDEX IF NOT EXISTS idx_sentence_vocab_word ON sentence_vocabulary(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_reading_documents_recent ON reading_documents(deleted_at,updated_at);
CREATE INDEX IF NOT EXISTS idx_reading_vocabulary_word ON reading_vocabulary(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_stories_level ON stories(hsk_level,difficulty);
CREATE INDEX IF NOT EXISTS idx_mistakes_open ON mistake_records(resolved,skill_type,last_wrong_at);
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

/** Adds a stable learning-skill label while preserving all older review rows. */
export const migrationV10Sql = `
ALTER TABLE review_log ADD COLUMN exercise_type TEXT;
`;

/** Fast, local lexical lookup for related words; no vocabulary data is replaced. */
export const migrationV11Sql = `
CREATE TABLE IF NOT EXISTS vocabulary_character_index (
  character TEXT NOT NULL,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  PRIMARY KEY(character, vocabulary_id)
);
CREATE INDEX IF NOT EXISTS idx_vocabulary_character_lookup ON vocabulary_character_index(character, vocabulary_id);
`;

/** App-managed image metadata; old image_uri remains for backward compatibility. */
export const migrationV12Sql = `
CREATE TABLE IF NOT EXISTS image_assets (
  id TEXT PRIMARY KEY NOT NULL,
  vocabulary_id TEXT NOT NULL UNIQUE REFERENCES vocabulary(id) ON DELETE CASCADE,
  local_uri TEXT NOT NULL,
  cloud_url TEXT,
  mime_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  checksum TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_image_assets_vocabulary ON image_assets(vocabulary_id);
INSERT OR IGNORE INTO image_assets(id,vocabulary_id,local_uri,created_at,updated_at)
SELECT 'image-' || id,id,image_uri,COALESCE(created_at,CURRENT_TIMESTAMP),COALESCE(updated_at,CURRENT_TIMESTAMP)
FROM vocabulary WHERE image_uri LIKE 'file:%' OR image_uri LIKE 'content:%';
`;

/** Additive curriculum/progress tables; existing vocabulary IDs and SRS are untouched. */
export const migrationV13Sql = `
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
  hsk_band TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY NOT NULL, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY NOT NULL, unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title TEXT NOT NULL, estimated_minutes INTEGER NOT NULL DEFAULT 10,
  xp_reward INTEGER NOT NULL DEFAULT 10, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lesson_activities (
  id TEXT PRIMARY KEY NOT NULL, lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK(activity_type IN ('VOCABULARY','GRAMMAR','LISTENING','SPEAKING','READING','HANZI','QUIZ')),
  title TEXT NOT NULL, target TEXT, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  lesson_id TEXT PRIMARY KEY NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','COMPLETED')),
  started_at TEXT NOT NULL, completed_at TEXT, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_activities_lesson ON lesson_activities(lesson_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_activity_progress_completed ON lesson_activity_progress(completed_at);
`;

export const latestIndexSql = `
CREATE INDEX IF NOT EXISTS idx_progress_next_review ON user_vocabulary_progress(next_review_at, memory_level, is_suspended);
CREATE INDEX IF NOT EXISTS idx_vocabulary_deck ON vocabulary(deck_id, is_custom);
CREATE INDEX IF NOT EXISTS idx_vocabulary_simplified ON vocabulary(simplified);
CREATE INDEX IF NOT EXISTS idx_vocabulary_traditional ON vocabulary(traditional);
CREATE INDEX IF NOT EXISTS idx_personal_deck_deleted ON personal_deck(deleted_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_progress_status_due ON user_vocabulary_progress(status, studied, next_review_at, is_suspended);
CREATE INDEX IF NOT EXISTS idx_reviews_mode ON review_log(mode, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_reviews_exercise_type ON review_log(exercise_type, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_character_lookup ON vocabulary_character_index(character, vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_vocabulary ON image_assets(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_activities_lesson ON lesson_activities(lesson_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_grammar_points_hsk ON grammar_points(hsk_level,difficulty);
CREATE INDEX IF NOT EXISTS idx_sentences_hsk ON sentences(hsk_level,difficulty);
CREATE INDEX IF NOT EXISTS idx_sentence_vocab_word ON sentence_vocabulary(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_reading_documents_recent ON reading_documents(deleted_at,updated_at);
CREATE INDEX IF NOT EXISTS idx_reading_vocabulary_word ON reading_vocabulary(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_stories_level ON stories(hsk_level,difficulty);
CREATE INDEX IF NOT EXISTS idx_mistakes_open ON mistake_records(resolved,skill_type,last_wrong_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_pinyin_compact ON vocabulary(
  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(pinyin_numeric,'1',''),'2',''),'3',''),'4',''),'5',''),' ',''),'ü','v'))
);
`;

export function isValidMigrationVersion(version: number): boolean {
  return Number.isInteger(version) && version >= 0 && version <= DATABASE_VERSION;
}
