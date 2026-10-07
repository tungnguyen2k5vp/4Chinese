/** Additive metadata only. Main owns integration into schema/migrations. No audio paths. */
export const migrationV37Sql = `
CREATE TABLE IF NOT EXISTS timed_speaking_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  prompt_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL CHECK(duration_ms BETWEEN 1 AND 120000),
  self_review TEXT NOT NULL DEFAULT '',
  checklist_json TEXT NOT NULL,
  transcript_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(transcript_opt_in IN (0,1)),
  transcript TEXT,
  audio_retention TEXT NOT NULL DEFAULT 'SESSION_ONLY' CHECK(audio_retention='SESSION_ONLY'),
  CHECK(transcript_opt_in=1 OR transcript IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_timed_speaking_recent
  ON timed_speaking_attempts(recorded_at DESC,id DESC);
`;
