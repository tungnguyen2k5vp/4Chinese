/** Additive only: no content rekeys or learner-state updates. */
export const migrationV36Sql = `
CREATE TABLE IF NOT EXISTS word_senses (
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  sense_id TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  definition_vi TEXT NOT NULL,
  definition_en TEXT,
  pinyin_numeric TEXT NOT NULL,
  usage_note TEXT NOT NULL DEFAULT '',
  source_ref TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(review_status IN ('DRAFT','REVIEWED','VERIFIED','PUBLISHED')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  PRIMARY KEY(vocabulary_id,sense_id),
  CHECK(review_status='DRAFT' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_word_senses_review ON word_senses(review_status,vocabulary_id);
CREATE TABLE IF NOT EXISTS word_sense_examples (
  vocabulary_id TEXT NOT NULL,
  sense_id TEXT NOT NULL,
  sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  PRIMARY KEY(vocabulary_id,sense_id,sentence_id),
  FOREIGN KEY(vocabulary_id,sense_id) REFERENCES word_senses(vocabulary_id,sense_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS word_collocations (
  vocabulary_id TEXT NOT NULL,
  sense_id TEXT NOT NULL,
  expression TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  translation_vi TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(review_status IN ('DRAFT','REVIEWED','VERIFIED','PUBLISHED')),
  PRIMARY KEY(vocabulary_id,sense_id,expression),
  FOREIGN KEY(vocabulary_id,sense_id) REFERENCES word_senses(vocabulary_id,sense_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_vocabulary_context (
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('READER','STORY','OCR','LESSON')),
  source_id TEXT NOT NULL,
  location TEXT NOT NULL,
  sentence TEXT NOT NULL CHECK(length(sentence) BETWEEN 1 AND 2000),
  sense_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(vocabulary_id,source_type,source_id,location)
);
CREATE INDEX IF NOT EXISTS idx_personal_context_recent ON personal_vocabulary_context(vocabulary_id,updated_at DESC);
`;
