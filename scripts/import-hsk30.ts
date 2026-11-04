/** User ZIP -> validated immutable bundle -> version-scoped SQLite records. */
import { createHash, randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { strFromU8, unzipSync } from "fflate";

import { getOfflineVocabulary } from "../src/db/database";
import {
  createLegacyDatabase,
  expoAdapter,
} from "../src/db/fixtures/legacy_database";
import { grammarSeed, seedGrammarContent } from "../src/db/grammar";
import {
  assertHsk30Installed,
  getHsk30Statistics,
  importHsk30Bundle,
  planHsk30Import,
  rollbackHsk30Import,
} from "../src/db/hsk30";
import { migrationV45Sql } from "../src/db/hsk30-schema";
import { migrateDatabaseSchema } from "../src/db/migrations";
import {
  HSK30_COUNTS,
  HSK30_KINDS,
  HSK30_LEVELS,
  HSK30_VERSION,
  matchHsk30Vocabulary,
  parseHsk30Csv,
  validateHsk30Bundle,
  type Hsk30Bundle,
  type Hsk30Kind,
} from "../src/services/hsk/hsk30-source";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
export function readHsk30Zip(path: string): Hsk30Bundle {
  const bytes = readFileSync(path);
  const entries = unzipSync(bytes, {
    filter: (file) =>
      /^(?:by_type\/|by_level\/|metadata\/|README\.md$)/u.test(file.name) &&
      file.originalSize < 10_000_000,
  });
  const read = (name: string) => {
    const file = entries[name];
    if (!file) throw new Error(`MISSING_ZIP_FILE:${name}`);
    return strFromU8(file).replace(/^\uFEFF/u, "");
  };
  read("README.md");
  const schema = JSON.parse(read("metadata/schema.json"));
  const metadata = JSON.parse(read("metadata/verification_report.json"));
  parseHsk30Csv(read("metadata/quality_issues.csv"));
  const rows = Object.fromEntries(
    HSK30_KINDS.map((kind) => [
      kind,
      parseHsk30Csv(read(`by_type/${kind}.csv`)),
    ]),
  ) as Hsk30Bundle["rows"];
  const bundle: Hsk30Bundle = {
    version: HSK30_VERSION,
    zipSha256: sha(bytes),
    files: Object.fromEntries(
      Object.entries(entries).map(([name, file]) => [name, sha(file)]),
    ),
    rows,
    examples: parseHsk30Csv(read("by_type/grammar_examples.csv")),
  };
  validateHsk30Bundle(bundle);
  const counts = parseHsk30Csv(read("metadata/counts_by_level.csv"));
  for (const kind of HSK30_KINDS) {
    if (
      JSON.stringify(Object.keys(rows[kind][0]!)) !==
      JSON.stringify(schema.types[kind].fields)
    )
      throw new Error(`CSV_SCHEMA_MISMATCH:${kind}`);
    if (
      metadata.verified_file_counts[`by_type/${kind}.csv`] !== rows[kind].length
    )
      throw new Error(`METADATA_COUNT_MISMATCH:${kind}`);
    for (const [i, level] of HSK30_LEVELS.entries()) {
      const subset = rows[kind].filter(
        (row) => row.hsk_level === `HSK${level}`,
      );
      const divided = parseHsk30Csv(read(`by_level/HSK${level}/${kind}.csv`));
      if (JSON.stringify(subset) !== JSON.stringify(divided))
        throw new Error(`DIVIDED_SOURCE_MISMATCH:${kind}:${level}`);
      if (
        Number(
          counts.find(
            (row) =>
              row.record_type === kind && row.hsk_level === `HSK${level}`,
          )?.rows,
        ) !== HSK30_COUNTS[kind][i]
      )
        throw new Error(`COUNTS_METADATA_MISMATCH:${kind}:${level}`);
    }
  }
  if (metadata.grammar_example_rows !== bundle.examples.length)
    throw new Error("EXAMPLE_METADATA_MISMATCH");
  return bundle;
}

function protectedSnapshot(sqlite: DatabaseSync) {
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all() as { name: string }[];
  return Object.fromEntries(
    tables
      .filter(
        ({ name }) =>
          !name.startsWith("hsk_syllabus_") && name !== "hsk_standard_versions",
      )
      .map(({ name }) => {
        const rows = sqlite
          .prepare(`SELECT * FROM "${name.replace(/"/gu, '""')}"`)
          .all()
          .map((row) => JSON.stringify(row))
          .sort();
        return [
          name,
          { count: rows.length, sha256: sha(JSON.stringify(rows)) },
        ];
      }),
  );
}
function auditBaseline(sqlite: DatabaseSync) {
  return {
    tables: protectedSnapshot(sqlite),
    vocabularyLevels: sqlite
      .prepare(
        "SELECT hsk_band,COUNT(*) AS count FROM vocabulary GROUP BY hsk_band",
      )
      .all(),
    grammarLevels: sqlite
      .prepare(
        "SELECT hsk_level,COUNT(*) AS count FROM grammar_points GROUP BY hsk_level",
      )
      .all(),
    missingVocabularyMeaning: sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM vocabulary WHERE TRIM(primary_meaning_vi)='' OR translation_status='missing'",
      )
      .get(),
    duplicateHeadwords: sqlite
      .prepare(
        "SELECT simplified,COUNT(*) AS count,COUNT(DISTINCT pinyin_numeric) AS readings FROM vocabulary WHERE is_custom=0 GROUP BY simplified HAVING COUNT(*)>1",
      )
      .all(),
    unclassified: sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM vocabulary WHERE hsk_band NOT IN ('1','2','3','4','5','6','7-9')",
      )
      .get(),
  };
}

async function createTestBaseline(path: string) {
  if (existsSync(path)) throw new Error("TEST_DB_ALREADY_EXISTS");
  mkdirSync(dirname(path), { recursive: true });
  const fixture = createLegacyDatabase();
  try {
    const db = expoAdapter(fixture);
    await migrateDatabaseSchema(db);
    const insert =
      fixture.prepare(`INSERT OR IGNORE INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,
      meanings_vi,meanings_en,pos,hsk_band,source,source_version,source_url,translation_status,search_text) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const word of getOfflineVocabulary())
      insert.run(
        word.id,
        word.simplified,
        word.traditional,
        word.pinyin,
        word.pinyinNumeric,
        word.primaryMeaningVi,
        JSON.stringify(word.meaningsVi),
        JSON.stringify(word.meaningsEn),
        JSON.stringify(word.pos),
        String(word.hskBand),
        word.source,
        word.sourceVersion,
        word.sourceUrl,
        word.translationStatus,
        `${word.simplified} ${word.pinyin} ${word.primaryMeaningVi}`,
      );
    await seedGrammarContent(db, getOfflineVocabulary(), {
      includePendingDrafts: true,
    });
    fixture.exec("PRAGMA user_version=44");
    await backup(fixture, path);
  } finally {
    fixture.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set([
    "--zip",
    "--db",
    "--create-test-db",
    "--dry-run",
    "--apply",
    "--bundle",
    "--rollback",
  ]);
  for (let i = 0; i < args.length; i++) {
    if (!flags.has(args[i]!)) throw new Error(`UNKNOWN_ARGUMENT:${args[i]}`);
    if (["--zip", "--db", "--create-test-db"].includes(args[i]!)) {
      if (!args[++i] || args[i]!.startsWith("--"))
        throw new Error("ARGUMENT_VALUE_REQUIRED");
    }
  }
  const value = (flag: string) =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const writes = ["--apply", "--rollback", "--bundle"].filter((flag) =>
    args.includes(flag),
  );
  if (writes.length > 1 || (writes.length && args.includes("--dry-run")))
    throw new Error("CHOOSE_ONE_MODE");
  const bundle = value("--zip")
    ? readHsk30Zip(resolve(value("--zip")!))
    : (JSON.parse(
        readFileSync(resolve(root, "src/data/hsk30-2025-11.json"), "utf8"),
      ) as Hsk30Bundle);
  validateHsk30Bundle(bundle);
  const runDir = resolve(
    root,
    `artifacts/hsk30-import-${new Date().toISOString().replace(/[:.]/gu, "-")}-${randomUUID().slice(0, 8)}`,
  );
  mkdirSync(runDir, { recursive: true });
  const words = getOfflineVocabulary();
  const sourceMapping = matchHsk30Vocabulary(
    bundle.rows.vocabulary,
    words.map((word) => ({
      id: word.id,
      simplified: word.simplified,
      pinyin: word.pinyin,
      pinyin_numeric: word.pinyinNumeric,
      pos: JSON.stringify(word.pos),
      hsk_band: String(word.hskBand),
    })),
  );
  const sourceRows = new Map(
    bundle.rows.vocabulary.map((row) => [row.id, row]),
  );
  const wordGroups = new Map<string, typeof words>();
  for (const word of words)
    wordGroups.set(word.simplified, [
      ...(wordGroups.get(word.simplified) ?? []),
      word,
    ]);
  writeFileSync(
    resolve(runDir, "source-before.json"),
    JSON.stringify(
      {
        scope: "CURRENT_BUNDLED_SOURCE_NOT_PHONE_DATABASE",
        totalVocabulary: words.length,
        vocabularyLevels: Object.fromEntries(
          HSK30_LEVELS.map((level) => [
            level,
            words.filter((word) => String(word.hskBand) === level).length,
          ]),
        ),
        grammarSeed: grammarSeed.length,
        grammarLevels: Object.fromEntries(
          HSK30_LEVELS.map((level) => [
            level,
            grammarSeed.filter(
              (row) =>
                row.hsk === level ||
                (level === "7-9" && ["7", "8", "9"].includes(row.hsk)),
            ).length,
          ]),
        ),
        missingMeaning: words.filter(
          (word) =>
            word.translationStatus === "missing" ||
            !word.primaryMeaningVi.trim(),
        ).length,
        missingPos: words.filter((word) => !word.pos.length).length,
        duplicateHeadwords: [...wordGroups]
          .filter(([, rows]) => rows.length > 1)
          .map(([word, rows]) => ({
            word,
            ids: rows.map((row) => row.id),
            readings: rows.map((row) => row.pinyinNumeric),
          })),
        originalVocabularySha256: sha(
          readFileSync(resolve(root, "src/data/hsk-vocabulary.json")),
        ),
        completeEffectiveVocabularySha256: sha(JSON.stringify(words)),
        classification: countStatus(sourceMapping),
        reasons: Object.fromEntries(
          [...new Set(sourceMapping.map((row) => row.reason))].map((reason) => [
            reason,
            sourceMapping.filter((row) => row.reason === reason).length,
          ]),
        ),
        sourceQuality: {
          missingPos: bundle.rows.vocabulary.filter((row) => !row.pos_zh)
            .length,
          missingGrammarPattern: bundle.rows.grammar.filter(
            (row) => !row.pattern_zh,
          ).length,
          vocabularyWithoutVietnamese: bundle.rows.vocabulary.filter(
            (row) => !row.meaning_vi,
          ).length,
          grammarWithoutVietnamese: bundle.rows.grammar.filter(
            (row) => !row.explanation_vi,
          ).length,
        },
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  writeFileSync(
    resolve(runDir, "source-mapping.json"),
    JSON.stringify(sourceMapping, null, 2),
    { flag: "wx" },
  );
  writeFileSync(
    resolve(runDir, "source-vocabulary-unresolved.json"),
    JSON.stringify(
      sourceMapping
        .filter((row) => row.status !== "MATCHED")
        .map((row) => ({ ...row, source: sourceRows.get(row.sourceId) })),
      null,
      2,
    ),
    { flag: "wx" },
  );
  if (value("--zip"))
    copyFileSync(resolve(value("--zip")!), resolve(runDir, "source.zip"));
  if (args.includes("--bundle")) {
    const target = resolve(root, "src/data/hsk30-2025-11.json");
    if (
      existsSync(target) &&
      readFileSync(target, "utf8") !== JSON.stringify(bundle)
    )
      throw new Error("IMMUTABLE_BUNDLE_ALREADY_EXISTS");
    if (!existsSync(target))
      writeFileSync(target, JSON.stringify(bundle), { flag: "wx" });
    writeFileSync(
      resolve(runDir, "source-verification.json"),
      JSON.stringify(
        {
          zipSha256: bundle.zipSha256,
          counts: HSK30_COUNTS,
          files: bundle.files,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    console.log(
      JSON.stringify({
        mode: "bundle",
        runDir,
        zipSha256: bundle.zipSha256,
        counts: HSK30_COUNTS,
      }),
    );
    return;
  }
  const targetDb = value("--db") ?? value("--create-test-db");
  if (!targetDb)
    throw new Error(
      "DB_REQUIRED: use --create-test-db artifacts/hsk30-test/baseline.sqlite for an isolated populated test database",
    );
  const path = resolve(root, targetDb);
  const fromRoot = relative(resolve(root, "artifacts"), path);
  if (
    (writes.length || value("--create-test-db")) &&
    (fromRoot.startsWith("..") || isAbsolute(fromRoot))
  )
    throw new Error("WRITE_SCOPE_RESTRICTED_TO_REPOSITORY_ARTIFACTS");
  if (value("--create-test-db")) await createTestBaseline(path);
  if (!existsSync(path)) throw new Error("DB_NOT_FOUND");
  const sqlite = new DatabaseSync(path, { readOnly: !writes.length });
  try {
    const db = expoAdapter(sqlite);
    const before = auditBaseline(sqlite);
    writeFileSync(
      resolve(runDir, "before.json"),
      JSON.stringify(before, null, 2),
      { flag: "wx" },
    );
    const plan = await planHsk30Import(db, bundle);
    writeFileSync(
      resolve(runDir, "mapping.json"),
      JSON.stringify(plan, null, 2),
      { flag: "wx" },
    );
    const unresolved = plan.vocabulary
      .filter((row) => row.status !== "MATCHED")
      .map((row) => ({
        ...row,
        source: bundle.rows.vocabulary.find(
          (source) => source.id === row.sourceId,
        ),
      }));
    writeFileSync(
      resolve(runDir, "vocabulary-unresolved.json"),
      JSON.stringify(unresolved, null, 2),
      { flag: "wx" },
    );
    let result: unknown = {
      mode: "dry-run",
      vocabulary: countStatus(plan.vocabulary),
      grammar: countStatus(plan.grammar),
    };
    if (args.includes("--apply") || args.includes("--rollback")) {
      const snapshotPath = resolve(runDir, "before.sqlite");
      await backup(sqlite, snapshotPath);
      sqlite.exec("PRAGMA foreign_keys=ON");
      if (args.includes("--rollback")) {
        await rollbackHsk30Import(db, bundle.zipSha256);
        result = { mode: "rollback" };
      } else {
        sqlite.exec(migrationV45Sql);
        result = await importHsk30Bundle(db, bundle);
        await assertHsk30Installed(db, bundle);
        result = {
          ...(result as object),
          counts: await getHsk30Statistics(db),
        };
      }
      const after = protectedSnapshot(sqlite);
      if (JSON.stringify(before.tables) !== JSON.stringify(after))
        throw new Error("PROTECTED_DATABASE_CONTENT_CHANGED");
      writeFileSync(
        resolve(runDir, "after.json"),
        JSON.stringify(
          {
            tables: after,
            foreignKeys: sqlite.prepare("PRAGMA foreign_key_check").all(),
            result,
          },
          null,
          2,
        ),
        { flag: "wx" },
      );
      writeFileSync(
        resolve(runDir, "protection-proof.json"),
        JSON.stringify(
          {
            allPreexistingContentAndLearnerTablesUnchanged: true,
            beforeDatabaseSha256: sha(readFileSync(snapshotPath)),
            tables: after,
          },
          null,
          2,
        ),
        { flag: "wx" },
      );
    }
    writeFileSync(
      resolve(runDir, "result.json"),
      JSON.stringify(
        {
          result,
          zipSha256: bundle.zipSha256,
          sourceCounts: HSK30_COUNTS,
          baselineGrammarSeed: grammarSeed.length,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    console.log(
      JSON.stringify(
        {
          runDir,
          mode: writes[0] ?? "--dry-run",
          vocabulary: countStatus(plan.vocabulary),
          grammar: countStatus(plan.grammar),
          protectedTables: Object.keys(before.tables).length,
          resultFile: resolve(runDir, "result.json"),
        },
        null,
        2,
      ),
    );
  } finally {
    sqlite.close();
  }
}
function countStatus(rows: { status: string }[]) {
  return Object.fromEntries(
    ["MATCHED", "MISSING", "CONFLICT"].map((status) => [
      status,
      rows.filter((row) => row.status === status).length,
    ]),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
