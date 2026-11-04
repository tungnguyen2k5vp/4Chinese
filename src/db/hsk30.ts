import type { SQLiteDatabase } from "expo-sqlite";

import {
  HSK30_COUNTS,
  HSK30_KINDS,
  HSK30_LEVELS,
  HSK30_VERSION,
  matchHsk30Vocabulary,
  sourceLevel,
  validateHsk30Bundle,
  type Hsk30Bundle,
  type Hsk30Kind,
  type Hsk30VocabularyCandidate,
  type SourceRow,
} from "../services/hsk/hsk30-source";

type SqlValue = string | number | null;
async function batchInsert(
  db: SQLiteDatabase,
  table: string,
  columns: string[],
  rows: SqlValue[][],
) {
  for (let i = 0; i < rows.length; i += 80) {
    const batch = rows.slice(i, i + 80);
    await db.runAsync(
      `INSERT INTO ${table}(${columns.join(",")}) VALUES ${batch.map(() => `(${columns.map(() => "?").join(",")})`).join(",")}`,
      batch.flat(),
    );
  }
}
export async function planHsk30Import(db: SQLiteDatabase, bundle: Hsk30Bundle) {
  validateHsk30Bundle(bundle);
  const words = await db.getAllAsync<Hsk30VocabularyCandidate>(
    "SELECT id,simplified,pinyin,pinyin_numeric,pos,hsk_band FROM vocabulary WHERE is_custom=0 ORDER BY id",
  );
  const vocabulary = matchHsk30Vocabulary(bundle.rows.vocabulary, words);
  const grammar = await db.getAllAsync<{
    id: string;
    title: string;
    pattern: string;
  }>("SELECT id,title,pattern FROM grammar_points ORDER BY id");
  const normalize = (text: string) => text.normalize("NFC").replace(/\s/gu, "");
  const grammarLinks = bundle.rows.grammar.map((row) => {
    // Exact title AND pattern only. Shared labels/patterns alone cannot identify a grammar sense.
    const matches = row.pattern_zh
      ? grammar.filter(
          (point) =>
            normalize(point.title) === normalize(row.title_zh!) &&
            normalize(point.pattern) === normalize(row.pattern_zh!),
        )
      : [];
    return {
      sourceId: row.id!,
      grammarId: matches.length === 1 ? matches[0]!.id : null,
      status:
        matches.length === 1
          ? "MATCHED"
          : matches.length
            ? "CONFLICT"
            : "MISSING",
      candidates: matches.map((x) => x.id),
    };
  });
  return { vocabulary, grammar: grammarLinks };
}

export async function importHsk30Bundle(
  db: SQLiteDatabase,
  bundle: Hsk30Bundle,
) {
  validateHsk30Bundle(bundle);
  const marker = await db.getFirstAsync<{ zip_sha256: string }>(
    "SELECT zip_sha256 FROM hsk_syllabus_imports WHERE version_id=?",
    bundle.version,
  );
  if (marker) {
    if (marker.zip_sha256 !== bundle.zipSha256)
      throw new Error("IMMUTABLE_HSK_VERSION_CONFLICT");
    await assertHsk30Installed(db, bundle);
    return { installed: false, report: await getHsk30Statistics(db) };
  }
  const plan = await planHsk30Import(db, bundle);
  await db.withTransactionAsync(async () => {
    const version = await db.getFirstAsync(
      "SELECT id FROM hsk_standard_versions WHERE id=?",
      bundle.version,
    );
    if (version) throw new Error("HSK_VERSION_ALREADY_RESERVED");
    await db.runAsync(
      `INSERT INTO hsk_standard_versions(id,name,version,effective_date,source,status,created_at)
      VALUES(?,?,?,NULL,?,'UNVERIFIED',?)`,
      bundle.version,
      "HSK 3.0 · 11/2025 (dữ liệu người dùng)",
      "2025-11",
      `user ZIP sha256:${bundle.zipSha256}`,
      new Date().toISOString(),
    );
    await batchInsert(
      db,
      "hsk_syllabus_items",
      [
        "version_id",
        "kind",
        "source_id",
        "level",
        "source_order",
        "content_json",
      ],
      HSK30_KINDS.flatMap((kind) =>
        bundle.rows[kind].map((row) => [
          bundle.version,
          kind,
          row.id!,
          sourceLevel(row),
          Number(row.source_order),
          JSON.stringify(row),
        ]),
      ),
    );
    await batchInsert(
      db,
      "hsk_syllabus_examples",
      [
        "version_id",
        "kind",
        "grammar_source_id",
        "example_index",
        "content_json",
      ],
      bundle.examples.map((row) => [
        bundle.version,
        "grammar",
        row.grammar_id!,
        Number(row.example_index),
        JSON.stringify(row),
      ]),
    );
    await batchInsert(
      db,
      "hsk_syllabus_links",
      [
        "version_id",
        "kind",
        "source_id",
        "vocabulary_id",
        "grammar_id",
        "status",
        "candidates_json",
      ],
      [
        ...plan.vocabulary.map((row) => [
          bundle.version,
          "vocabulary",
          row.sourceId,
          row.vocabularyId,
          null,
          row.status,
          JSON.stringify(row.candidates),
        ]),
        ...plan.grammar.map((row) => [
          bundle.version,
          "grammar",
          row.sourceId,
          null,
          row.grammarId,
          row.status,
          JSON.stringify(row.candidates),
        ]),
      ],
    );
    await db.runAsync(
      "INSERT INTO hsk_syllabus_imports(version_id,zip_sha256,installed_at,item_count,example_count) VALUES(?,?,?,?,?)",
      bundle.version,
      bundle.zipSha256,
      new Date().toISOString(),
      16986,
      2059,
    );
    await assertHsk30Installed(db, bundle);
    if ((await db.getAllAsync("PRAGMA foreign_key_check")).length)
      throw new Error("HSK_IMPORT_FOREIGN_KEY_FAILURE");
  });
  return { installed: true, report: await getHsk30Statistics(db) };
}

export async function assertHsk30Installed(
  db: SQLiteDatabase,
  bundle: Hsk30Bundle,
) {
  const items = await db.getAllAsync<{
    kind: Hsk30Kind;
    source_id: string;
    level: string;
    source_order: number;
    content_json: string;
  }>(
    "SELECT kind,source_id,level,source_order,content_json FROM hsk_syllabus_items WHERE version_id=?",
    bundle.version,
  );
  if (items.length !== 16986) throw new Error("HSK_IMPORT_ITEM_COUNT_FAILURE");
  const source = new Map(
    HSK30_KINDS.flatMap((kind) =>
      bundle.rows[kind].map(
        (row) => [`${kind}:${row.id}`, JSON.stringify(row)] as const,
      ),
    ),
  );
  for (const item of items)
    if (source.get(`${item.kind}:${item.source_id}`) !== item.content_json)
      throw new Error(`HSK_SOURCE_CONTENT_CHANGED:${item.source_id}`);
    else {
      const row = JSON.parse(item.content_json) as SourceRow;
      if (
        item.level !== sourceLevel(row) ||
        item.source_order !== Number(row.source_order)
      )
        throw new Error("HSK_SOURCE_CLASSIFICATION_CHANGED");
    }
  const examples = await db.getAllAsync<{
    grammar_source_id: string;
    example_index: number;
    content_json: string;
  }>(
    "SELECT grammar_source_id,example_index,content_json FROM hsk_syllabus_examples WHERE version_id=?",
    bundle.version,
  );
  const expected = new Map(
    bundle.examples.map((row) => [
      `${row.grammar_id}:${row.example_index}`,
      JSON.stringify(row),
    ]),
  );
  if (examples.length !== 2059)
    throw new Error("HSK_IMPORT_EXAMPLE_COUNT_FAILURE");
  for (const row of examples)
    if (
      expected.get(`${row.grammar_source_id}:${row.example_index}`) !==
      row.content_json
    )
      throw new Error("HSK_SOURCE_EXAMPLE_CHANGED");
  const links = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM hsk_syllabus_links WHERE version_id=?",
    bundle.version,
  );
  if (links?.count !== 11593) throw new Error("HSK_IMPORT_LINK_COUNT_FAILURE");
}

export async function rollbackHsk30Import(
  db: SQLiteDatabase,
  zipSha256: string,
) {
  await db.withTransactionAsync(async () => {
    const marker = await db.getFirstAsync<{ zip_sha256: string }>(
      "SELECT zip_sha256 FROM hsk_syllabus_imports WHERE version_id=?",
      HSK30_VERSION,
    );
    if (!marker || marker.zip_sha256 !== zipSha256)
      throw new Error("ROLLBACK_VERSION_CHECKSUM_MISMATCH");
    const otherReference = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM hsk_reference_entries WHERE standard_version_id=?",
      HSK30_VERSION,
    );
    if (otherReference?.count)
      throw new Error("ROLLBACK_VERSION_HAS_OTHER_REFERENCES");
    for (const table of [
      "hsk_syllabus_links",
      "hsk_syllabus_examples",
      "hsk_syllabus_items",
      "hsk_syllabus_imports",
    ])
      await db.runAsync(
        `DELETE FROM ${table} WHERE version_id=?`,
        HSK30_VERSION,
      );
    await db.runAsync(
      "DELETE FROM hsk_standard_versions WHERE id=?",
      HSK30_VERSION,
    );
    if ((await db.getAllAsync("PRAGMA foreign_key_check")).length)
      throw new Error("ROLLBACK_FOREIGN_KEY_FAILURE");
  });
}

export async function getHsk30Statistics(db: SQLiteDatabase) {
  const counts = await db.getAllAsync<{
    kind: Hsk30Kind;
    level: string;
    count: number;
  }>(
    "SELECT kind,level,COUNT(*) AS count FROM hsk_syllabus_items WHERE version_id=? GROUP BY kind,level",
    HSK30_VERSION,
  );
  const links = await db.getAllAsync<{
    kind: string;
    status: string;
    count: number;
  }>(
    "SELECT kind,status,COUNT(*) AS count FROM hsk_syllabus_links WHERE version_id=? GROUP BY kind,status",
    HSK30_VERSION,
  );
  const levels = HSK30_LEVELS.map((level, index) => ({
    level,
    ...Object.fromEntries(
      HSK30_KINDS.map((kind) => [
        kind,
        counts.find((row) => row.kind === kind && row.level === level)?.count ??
          0,
      ]),
    ),
    cumulativeVocabulary: counts
      .filter(
        (row) =>
          row.kind === "vocabulary" &&
          HSK30_LEVELS.indexOf(row.level as never) <= index,
      )
      .reduce((n, row) => n + row.count, 0),
    expectedVocabulary: HSK30_COUNTS.vocabulary[index],
    expectedGrammar: HSK30_COUNTS.grammar[index],
  }));
  return { version: HSK30_VERSION, levels, links, counts };
}

export type Hsk30CatalogItem = {
  sourceId: string;
  level: string;
  row: SourceRow;
  vocabularyId: string | null;
  grammarId: string | null;
  status: string | null;
  meaningVi: string | null;
};
export async function listHsk30Catalog(
  db: SQLiteDatabase,
  kind: Hsk30Kind,
  level: string,
  search = "",
  limit = 100,
  offset = 0,
  reviewOnly = false,
): Promise<Hsk30CatalogItem[]> {
  const rows = await db.getAllAsync<{
    source_id: string;
    level: string;
    content_json: string;
    vocabulary_id: string | null;
    grammar_id: string | null;
    status: string | null;
    meaning_vi: string | null;
  }>(
    `SELECT i.source_id,i.level,i.content_json,l.vocabulary_id,l.grammar_id,l.status,v.primary_meaning_vi AS meaning_vi
    FROM hsk_syllabus_items i LEFT JOIN hsk_syllabus_links l ON l.version_id=i.version_id AND l.kind=i.kind AND l.source_id=i.source_id
    LEFT JOIN vocabulary v ON v.id=l.vocabulary_id
    WHERE i.version_id=? AND i.kind=? AND i.level=? AND (?='' OR i.content_json LIKE ? ESCAPE '\\')
      AND (?=0 OR l.status IN ('MISSING','CONFLICT'))
    ORDER BY i.source_order,i.source_id LIMIT ? OFFSET ?`,
    HSK30_VERSION,
    kind,
    level,
    search.trim(),
    `%${search.trim().replace(/[\\%_]/gu, "\\$&")}%`,
    reviewOnly && kind === "vocabulary" ? 1 : 0,
    Math.min(200, Math.max(1, limit)),
    Math.max(0, offset),
  );
  return rows.map((row) => ({
    sourceId: row.source_id,
    level: row.level,
    row: JSON.parse(row.content_json) as SourceRow,
    vocabularyId: row.vocabulary_id,
    grammarId: row.grammar_id,
    status: row.status,
    meaningVi: row.meaning_vi,
  }));
}
export async function getHsk30GrammarExamples(
  db: SQLiteDatabase,
  sourceId: string,
): Promise<SourceRow[]> {
  return (
    await db.getAllAsync<{ content_json: string }>(
      "SELECT content_json FROM hsk_syllabus_examples WHERE version_id=? AND grammar_source_id=? ORDER BY example_index",
      HSK30_VERSION,
      sourceId,
    )
  ).map((row) => JSON.parse(row.content_json) as SourceRow);
}

export async function getHsk30WordLevels(
  db: SQLiteDatabase,
  vocabularyId: string,
  sourceId?: string,
): Promise<string[]> {
  return (
    await db.getAllAsync<{ level: string }>(
      "SELECT DISTINCT i.level FROM hsk_syllabus_items i JOIN hsk_syllabus_links l ON l.version_id=i.version_id AND l.kind=i.kind AND l.source_id=i.source_id WHERE i.version_id=? AND i.kind='vocabulary' AND l.status='MATCHED' AND l.vocabulary_id=? AND (?='' OR i.source_id=?) ORDER BY CASE i.level WHEN '7-9' THEN 7 ELSE CAST(i.level AS INTEGER) END",
      HSK30_VERSION,
      vocabularyId,
      sourceId ?? "",
      sourceId ?? "",
    )
  ).map((row) => row.level);
}
