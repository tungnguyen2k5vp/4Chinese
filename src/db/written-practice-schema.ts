export const migrationV34Sql = `
CREATE TABLE IF NOT EXISTS written_practice (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('DRAFT','REVIEWED')),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_written_practice_exercise ON written_practice(exercise_id,updated_at DESC);
`;
