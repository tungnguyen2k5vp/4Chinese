/** V32 is additive; it never rekeys content or rewrites learner records. */
export const migrationV32Sql = `
CREATE TABLE IF NOT EXISTS hsk_standard_versions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('UNVERIFIED','VERIFIED','SUPERSEDED')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hsk_reference_entries (
  standard_version_id TEXT NOT NULL REFERENCES hsk_standard_versions(id),
  dimension TEXT NOT NULL CHECK(dimension IN ('VOCABULARY','CHARACTER','GRAMMAR','SYLLABLE')),
  official_identifier TEXT NOT NULL,
  official_level TEXT NOT NULL CHECK(official_level IN ('1','2','3','4','5','6','7-9')),
  content_json TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  PRIMARY KEY(standard_version_id,dimension,official_identifier)
);
CREATE TABLE IF NOT EXISTS hsk_vocabulary_alignment (
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id),
  standard_version_id TEXT NOT NULL REFERENCES hsk_standard_versions(id),
  official_identifier TEXT,
  official_level TEXT,
  alignment_status TEXT NOT NULL CHECK(alignment_status IN ('EXACT','NORMALIZED_MATCH','EXTRA','MISSING_REFERENCE','LEVEL_CONFLICT','SENSE_CONFLICT','NEEDS_REVIEW')),
  source_ref TEXT,
  review_status TEXT NOT NULL DEFAULT 'UNREVIEWED' CHECK(review_status IN ('UNREVIEWED','REVIEWED','VERIFIED')),
  PRIMARY KEY(vocabulary_id,standard_version_id)
);
CREATE INDEX IF NOT EXISTS idx_hsk_alignment_level_status
  ON hsk_vocabulary_alignment(standard_version_id,official_level,alignment_status);
CREATE TABLE IF NOT EXISTS hsk_content_alignment (
  content_id TEXT NOT NULL,
  dimension TEXT NOT NULL CHECK(dimension IN ('CHARACTER','GRAMMAR','SYLLABLE')),
  standard_version_id TEXT NOT NULL REFERENCES hsk_standard_versions(id),
  official_identifier TEXT,
  alignment_status TEXT NOT NULL CHECK(alignment_status IN ('EXACT','NORMALIZED_MATCH','EXTRA','MISSING_REFERENCE','LEVEL_CONFLICT','SENSE_CONFLICT','NEEDS_REVIEW')),
  source_ref TEXT,
  review_status TEXT NOT NULL DEFAULT 'UNREVIEWED' CHECK(review_status IN ('UNREVIEWED','REVIEWED','VERIFIED')),
  PRIMARY KEY(content_id,dimension,standard_version_id)
);
`;
