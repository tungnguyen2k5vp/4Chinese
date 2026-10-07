/** V5.1 context graph. This table is additive; the V5 personal context table remains intact. */
export const migrationV41Sql = `
CREATE TABLE IF NOT EXISTS word_contexts (
  id TEXT PRIMARY KEY NOT NULL,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('READER','STORY','OCR','LESSON','LISTENING','AI')),
  source_id TEXT NOT NULL,
  source_title TEXT NOT NULL DEFAULT '',
  sentence_text TEXT NOT NULL CHECK(length(sentence_text) BETWEEN 1 AND 2000),
  pinyin TEXT,
  translation_vi TEXT,
  position_metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE(vocabulary_id,source_type,source_id,position_metadata)
);
CREATE INDEX IF NOT EXISTS idx_word_contexts_vocabulary_recent
  ON word_contexts(vocabulary_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_word_contexts_source
  ON word_contexts(source_type,source_id,created_at DESC);
`;
