import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { importLocalBackup } from "../src/db/backup-repository";
import { initializeDatabase } from "../src/db/database";
import { expoAdapter } from "../src/db/fixtures/legacy_database";
import { migrateDatabaseSchema } from "../src/db/migrations";
import { DATABASE_VERSION } from "../src/db/schema";
import { parseBackupArchive } from "../src/services/backup/archive";
import { parseLocalBackup } from "../src/services/backup/format";

async function main() {
  const path = process.argv[2];
  if (!path)
    throw new Error(
      "Usage: npx tsx scripts/verify-device-backup.ts <backup.json>",
    );
  const backup = parseLocalBackup(readFileSync(path, "utf8"));
  const sqlite = new DatabaseSync(":memory:");
  try {
    const db = expoAdapter(sqlite);
    await initializeDatabase(db);
    await importLocalBackup(db, backup);
    const pairs = [
      ["personalDecks", "personal_deck", "id"],
      ["customVocabulary", "vocabulary", "id"],
      ["exampleSentences", "example_sentence", "id"],
      ["vocabularyProgress", "user_vocabulary_progress", "vocabulary_id"],
      ["reviewLogs", "review_log", "id"],
      ["dailyStats", "daily_stats", "date"],
      ["userSettings", "user_settings", "id"],
    ] as const;
    const afterPath = process.argv[3];
    if (afterPath) {
      const bytes = readFileSync(afterPath);
      const after = afterPath.endsWith(".zip")
        ? parseBackupArchive(bytes).backup
        : parseLocalBackup(bytes.toString("utf8"));
      assert.equal(
        after.schemaVersion,
        DATABASE_VERSION,
        "Device is not running the expected schema",
      );
      for (const [key, table, idColumn] of pairs) {
        const rows = new Map(
          after.data[key].map((row) => [row[idColumn], row]),
        );
        assert.equal(
          rows.size,
          after.data[key].length,
          `Duplicate records in ${table}`,
        );
        assert.equal(
          after.data[key].length,
          backup.data[key].length,
          `Record count changed in ${table}`,
        );
        for (const expected of backup.data[key]) {
          const actual = rows.get(expected[idColumn]);
          assert.ok(actual, `Device lost a record in ${table}`);
          for (const [column, value] of Object.entries(expected)) {
            if (key === "dailyStats" && column === "study_seconds") {
              assert.ok(
                typeof actual[column] === "number" &&
                  Number(actual[column]) >= Number(value),
                "Study time decreased",
              );
            } else
              assert.deepEqual(
                actual[column],
                value,
                `Device changed ${table}.${column}`,
              );
          }
        }
      }
      console.log(
        JSON.stringify({
          result: "DEVICE_COMPARISON_PASS",
          appVersion: after.appVersion,
          schemaVersion: after.schemaVersion,
          note: "Learner records and SRS unchanged; accumulated study time may increase.",
        }),
      );
    }
    for (const [key, table, idColumn] of pairs) {
      for (const expected of backup.data[key]) {
        const actual = sqlite
          .prepare(`SELECT * FROM ${table} WHERE ${idColumn}=?`)
          .get(expected[idColumn] as string | number)!;
        assert.ok(actual, `Missing record in ${table}`);
        for (const [column, value] of Object.entries(expected))
          assert.deepEqual(actual[column], value, `Changed ${table}.${column}`);
      }
    }
    const before = pairs.map(([, table]) =>
      sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(),
    );
    await migrateDatabaseSchema(db);
    assert.deepEqual(
      pairs.map(([, table]) =>
        sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(),
      ),
      before,
    );
    assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(sqlite.prepare("PRAGMA quick_check").get()!.quick_check, "ok");
    console.log(
      JSON.stringify({
        result: "PASS",
        sourceSchema: backup.schemaVersion,
        targetSchema: DATABASE_VERSION,
        customWords: backup.data.customVocabulary.length,
        decks: backup.data.personalDecks.length,
        progress: backup.data.vocabularyProgress.length,
        reviews: backup.data.reviewLogs.length,
        note: "Exported learner records validated in disposable SQLite; not a dump of the phone database.",
      }),
    );
  } finally {
    sqlite.close();
  }
}
void main().catch(() => {
  console.error(
    "Device backup verification FAILED. No phone data was modified.",
  );
  process.exitCode = 1;
});
