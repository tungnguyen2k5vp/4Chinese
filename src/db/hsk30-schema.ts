/** Separate, source-ID keyed classifications. No UPDATE/DELETE of learning content. */
export const migrationV45Sql = `
CREATE TABLE IF NOT EXISTS hsk_syllabus_items (
  version_id TEXT NOT NULL REFERENCES hsk_standard_versions(id),
  kind TEXT NOT NULL CHECK(kind IN ('vocabulary','grammar','topic','task','hanzi')),
  source_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('1','2','3','4','5','6','7-9')),
  source_order INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  PRIMARY KEY(version_id,kind,source_id)
);
CREATE INDEX IF NOT EXISTS idx_syllabus_level ON hsk_syllabus_items(version_id,kind,level,source_order);
CREATE TABLE IF NOT EXISTS hsk_syllabus_examples (
  version_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'grammar' CHECK(kind='grammar'),
  grammar_source_id TEXT NOT NULL,
  example_index INTEGER NOT NULL CHECK(example_index>0),
  content_json TEXT NOT NULL,
  PRIMARY KEY(version_id,grammar_source_id,example_index),
  FOREIGN KEY(version_id,kind,grammar_source_id) REFERENCES hsk_syllabus_items(version_id,kind,source_id)
);
CREATE TABLE IF NOT EXISTS hsk_syllabus_links (
  version_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('vocabulary','grammar')),
  source_id TEXT NOT NULL,
  vocabulary_id TEXT REFERENCES vocabulary(id),
  grammar_id TEXT REFERENCES grammar_points(id),
  status TEXT NOT NULL CHECK(status IN ('MATCHED','MISSING','CONFLICT')),
  candidates_json TEXT NOT NULL,
  PRIMARY KEY(version_id,kind,source_id),
  FOREIGN KEY(version_id,kind,source_id) REFERENCES hsk_syllabus_items(version_id,kind,source_id),
  CHECK((kind='vocabulary' AND grammar_id IS NULL) OR (kind='grammar' AND vocabulary_id IS NULL)),
  CHECK((status='MATCHED' AND (vocabulary_id IS NOT NULL OR grammar_id IS NOT NULL)) OR
    (status<>'MATCHED' AND vocabulary_id IS NULL AND grammar_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_syllabus_vocabulary ON hsk_syllabus_links(vocabulary_id,version_id);
CREATE TABLE IF NOT EXISTS hsk_syllabus_imports (
  version_id TEXT PRIMARY KEY NOT NULL REFERENCES hsk_standard_versions(id),
  zip_sha256 TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  item_count INTEGER NOT NULL,
  example_count INTEGER NOT NULL,
  backup_name TEXT
);
`;
