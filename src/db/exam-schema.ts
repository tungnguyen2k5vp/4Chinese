/** Additive V33; attempts own immutable content snapshots, not content FKs. */
export const migrationV33Sql = `
CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('1','2','3','4','5','6','7-9')),
  status TEXT NOT NULL CHECK(status IN ('IN_PROGRESS','SUBMITTED')),
  snapshot_json TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL CHECK(started_at_ms >= 0),
  submitted_at_ms INTEGER,
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_recent ON exam_attempts(status,started_at_ms DESC);
`;
