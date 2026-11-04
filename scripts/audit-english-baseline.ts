import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { backup } from "node:sqlite";

import { getOfflineVocabulary } from "../src/db/database";
import {
  createLegacyDatabase,
  expoAdapter,
} from "../src/db/fixtures/legacy_database";
import { migrateDatabaseSchema } from "../src/db/migrations";
import { DATABASE_VERSION } from "../src/db/schema";

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
function hash(text: string | Buffer) {
  return createHash("sha256").update(text).digest("hex");
}
async function main() {
  const directory = resolve("artifacts/v7-2026-10-10/baseline-" + randomUUID());
  mkdirSync(directory, { recursive: true });
  const sqlite = createLegacyDatabase();
  try {
    // Fixture is explicitly synthetic legacy learner data, not the user's phone.
    await migrateDatabaseSchema(expoAdapter(sqlite));
    sqlite.exec("PRAGMA user_version=" + DATABASE_VERSION);
    await backup(sqlite, resolve(directory, "chinese-v45-fixture.sqlite"));
    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map((row) => {
        const name = String(row.name);
        const records = sqlite
          .prepare('SELECT * FROM "' + name.replace(/"/gu, '""') + '"')
          .all()
          .map((value) => JSON.stringify(value))
          .sort();
        return {
          name,
          count: records.length,
          sha256: hash(JSON.stringify(records)),
        };
      });
    const words = getOfflineVocabulary();
    const report = {
      scope: "BUNDLED_SOURCE_AND_SYNTHETIC_LEGACY_FIXTURE_NOT_PHONE",
      schemaVersion: DATABASE_VERSION,
      app: JSON.parse(readFileSync("package.json", "utf8")).version,
      rawVocabularyHash: hash(readFileSync("src/data/hsk-vocabulary.json")),
      vocabulary: words.length,
      levels: Object.fromEntries(
        ["1", "2", "3", "4", "5", "6", "7-9"].map((level) => [
          level,
          words.filter((word) => String(word.hskBand) === level).length,
        ]),
      ),
      fixtureTables: tables,
      sourceFiles: files(resolve("src")).map((path) => ({
        path: relative(process.cwd(), path),
        sha256: hash(readFileSync(path)),
      })),
      phoneSnapshot: false,
      productionWrites: false,
    };
    writeFileSync(
      resolve(directory, "baseline.json"),
      JSON.stringify(report, null, 2),
      { flag: "wx" },
    );
    console.log(
      JSON.stringify({
        directory,
        schemaVersion: report.schemaVersion,
        vocabulary: report.vocabulary,
        fixtureTableCount: tables.length,
      }),
    );
  } finally {
    sqlite.close();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
