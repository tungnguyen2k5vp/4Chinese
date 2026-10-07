import type { SQLiteDatabase } from "expo-sqlite";

import {
  auditHskCoverage,
  assertNoDuplicateOfficialMapping,
  type OfficialVocabularyEntry,
  type VocabularyCandidate,
} from "@/services/hsk/alignment";

export interface HskReferenceVersion {
  id: string;
  name: string;
  version: string;
  effectiveDate: string | null;
  source: string;
}

/** References are immutable per version and UNVERIFIED until editorial review.
 * Import affects only reference/crosswalk tables, never learning content or SRS. */
export async function importHskVocabularyReference(
  db: SQLiteDatabase,
  version: HskReferenceVersion,
  entries: readonly OfficialVocabularyEntry[],
) {
  if (
    !version.id.trim() ||
    !version.name.trim() ||
    !version.version.trim() ||
    !version.source.trim()
  )
    throw new Error("INVALID_HSK_STANDARD_VERSION");
  if (entries.length === 0) throw new Error("EMPTY_OFFICIAL_REFERENCE");
  assertNoDuplicateOfficialMapping(entries);
  let result: ReturnType<typeof auditHskCoverage> | undefined;
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM hsk_standard_versions WHERE id=?",
      version.id,
    );
    if (existing) throw new Error("HSK_REFERENCE_VERSION_ALREADY_EXISTS");
    await db.runAsync(
      `INSERT INTO hsk_standard_versions(id,name,version,effective_date,source,status,created_at)
      VALUES(?,?,?,?,?,'UNVERIFIED',?)`,
      version.id,
      version.name,
      version.version,
      version.effectiveDate,
      version.source,
      new Date().toISOString(),
    );
    for (const entry of entries)
      await db.runAsync(
        `INSERT INTO hsk_reference_entries(standard_version_id,dimension,official_identifier,official_level,content_json,source_ref)
      VALUES(?,'VOCABULARY',?,?,?,?)`,
        version.id,
        entry.identifier,
        entry.level,
        JSON.stringify(entry),
        entry.sourceRef,
      );
    const words = await db.getAllAsync<VocabularyCandidate>(
      `SELECT id,simplified,pinyin_numeric AS pinyinNumeric,hsk_band AS hskBand FROM vocabulary WHERE is_custom=0 ORDER BY id`,
    );
    result = auditHskCoverage(words, entries);
    for (const row of result.rows)
      if (row.vocabularyId)
        await db.runAsync(
          `INSERT INTO hsk_vocabulary_alignment(vocabulary_id,standard_version_id,official_identifier,official_level,alignment_status,source_ref,review_status)
      VALUES(?,?,?,?,?,?,'UNREVIEWED')`,
          row.vocabularyId,
          version.id,
          row.officialIdentifier,
          row.officialIdentifier ? row.level : null,
          row.status,
          row.sourceRef,
        );
    const count = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM hsk_reference_entries WHERE standard_version_id=? AND dimension='VOCABULARY'",
      version.id,
    );
    if (count?.count !== entries.length)
      throw new Error("HSK_REFERENCE_IMPORT_INCOMPLETE");
    if ((await db.getAllAsync("PRAGMA foreign_key_check")).length)
      throw new Error("HSK_REFERENCE_INTEGRITY_FAILED");
  });
  if (!result) throw new Error("HSK_REFERENCE_IMPORT_INCOMPLETE");
  return result;
}
