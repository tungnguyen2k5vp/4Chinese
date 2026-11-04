/** Additive V6 storage for user-selected personal contexts and recent error evidence. */
export const migrationV44Sql = `
CREATE TABLE IF NOT EXISTS personal_context_memory (
  id TEXT PRIMARY KEY NOT NULL,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('READER','STORY','OCR','LESSON','LISTENING','AI_SELECTED','CUSTOM')),
  source_id TEXT NOT NULL,
  source_title TEXT NOT NULL DEFAULT '',
  sentence_text TEXT NOT NULL CHECK(length(sentence_text) BETWEEN 1 AND 2000),
  pinyin TEXT,
  translation_vi TEXT,
  sense_id TEXT,
  context_locator TEXT NOT NULL DEFAULT '',
  user_selected INTEGER NOT NULL CHECK(user_selected=1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(vocabulary_id,source_type,source_id,context_locator)
);
CREATE INDEX IF NOT EXISTS idx_personal_context_memory_recent
  ON personal_context_memory(vocabulary_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_context_memory_source
  ON personal_context_memory(source_type,source_id,created_at DESC);

-- Backfill only previously user-saved local contexts. AI-source rows are intentionally
-- excluded because the old shape did not record whether a user had explicitly selected them.
INSERT OR IGNORE INTO personal_context_memory
  (id,vocabulary_id,source_type,source_id,source_title,sentence_text,pinyin,translation_vi,
   sense_id,context_locator,user_selected,created_at,updated_at)
SELECT 'legacy-' || lower(hex(c.vocabulary_id || char(0) || c.source_type || char(0) ||
       c.source_id || char(0) || c.location)), c.vocabulary_id,c.source_type,c.source_id,'',c.sentence,
       NULL,NULL,c.sense_id,c.location,1,c.created_at,c.updated_at
FROM personal_vocabulary_context c;
INSERT OR IGNORE INTO personal_context_memory
  (id,vocabulary_id,source_type,source_id,source_title,sentence_text,pinyin,translation_vi,sense_id,
   context_locator,user_selected,created_at,updated_at)
SELECT 'legacy-' || lower(hex(c.vocabulary_id || char(0) || c.source_type || char(0) ||
       c.source_id || char(0) || c.position_metadata)), c.vocabulary_id,
       CASE WHEN c.source_type='AI' THEN 'AI_SELECTED' ELSE c.source_type END,
       c.source_id,c.source_title,c.sentence_text,c.pinyin,c.translation_vi,NULL,c.position_metadata,
       1,c.created_at,c.created_at
FROM word_contexts c
WHERE c.source_type='LISTENING';

CREATE TABLE IF NOT EXISTS practice_attempt_daily (
  mistake_id TEXT NOT NULL,
  skill_type TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  utc_day TEXT NOT NULL CHECK(length(utc_day)=10),
  attempt_count INTEGER NOT NULL CHECK(attempt_count > 0),
  error_count INTEGER NOT NULL CHECK(error_count >= 0 AND error_count <= attempt_count),
  PRIMARY KEY(mistake_id,utc_day)
);
CREATE INDEX IF NOT EXISTS idx_practice_attempt_daily_window
  ON practice_attempt_daily(utc_day,skill_type,exercise_type);
`;
