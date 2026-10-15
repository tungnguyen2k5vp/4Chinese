import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { initializeDatabase } from "./database";
import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import {
  getHsk30GrammarExamples,
  getHsk30Statistics,
  getHsk30WordLevels,
  importHsk30Bundle,
  listHsk30Catalog,
  planHsk30Import,
  rollbackHsk30Import,
} from "./hsk30";
import { migrateDatabaseSchema } from "./migrations";

import rawBundle from "@/data/hsk30-2025-11.json";
import type { Hsk30Bundle } from "@/services/hsk/hsk30-source";

const bundle = rawBundle as unknown as Hsk30Bundle;
function protectedHash(sqlite: DatabaseSync) {
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'hsk_syllabus_%' AND name<>'hsk_standard_versions' ORDER BY name",
    )
    .all() as { name: string }[];
  return createHash("sha256")
    .update(
      JSON.stringify(
        tables.map(({ name }) => [
          name,
          sqlite
            .prepare('SELECT * FROM "' + name + '"')
            .all()
            .map((row) => JSON.stringify(row))
            .sort(),
        ]),
      ),
    )
    .digest("hex");
}
describe("HSK30 real SQLite import safety", { timeout: 30000 }, () => {
  it("dry-runs, imports, reruns, rolls back and reimports without changing any existing table", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.exec("UPDATE vocabulary SET hsk_band='6' WHERE id='hsk-1-ni'");
      const before = protectedHash(sqlite);
      await planHsk30Import(db, bundle);
      expect(protectedHash(sqlite)).toBe(before);
      expect(
        sqlite.prepare("SELECT COUNT(*) AS n FROM hsk_syllabus_items").get(),
      ).toEqual({ n: 0 });
      expect((await importHsk30Bundle(db, bundle)).installed).toBe(true);
      expect(protectedHash(sqlite)).toBe(before);
      const stats = await getHsk30Statistics(db);
      expect(await getHsk30WordLevels(db, "hsk-1-ni")).toEqual(["1"]);
      expect(
        await getHsk30WordLevels(db, "hsk-1-ni", "wrong-source-id"),
      ).toEqual([]);
      expect(
        sqlite
          .prepare("SELECT hsk_band FROM vocabulary WHERE id='hsk-1-ni'")
          .get(),
      ).toEqual({ hsk_band: "6" });
      expect(stats.levels.map((row) => row.cumulativeVocabulary)).toEqual([
        300, 500, 1000, 2000, 3600, 5400, 11000,
      ]);
      expect(
        stats.counts
          .filter((row) => row.kind === "grammar")
          .map((row) => row.count),
      ).toEqual([70, 78, 96, 95, 70, 50, 134]);
      const first = await listHsk30Catalog(db, "grammar", "1");
      const examples = await getHsk30GrammarExamples(db, first[0]!.sourceId);
      expect(examples.map((row) => row.example_zh)).toEqual([
        "小高去哪儿了？",
        "今天我们学习第一课。",
      ]);
      expect(
        (await listHsk30Catalog(db, "vocabulary", "1", "爱"))[0]!.row.word,
      ).toBe("爱");
      expect(
        await listHsk30Catalog(db, "vocabulary", "1", "' OR 1=1 --"),
      ).toEqual([]);
      const a = await listHsk30Catalog(db, "vocabulary", "3", "", 100, 0),
        b = await listHsk30Catalog(db, "vocabulary", "3", "", 100, 100);
      expect(new Set([...a, ...b].map((row) => row.sourceId)).size).toBe(200);
      expect((await importHsk30Bundle(db, bundle)).installed).toBe(false);
      await rollbackHsk30Import(db, bundle.zipSha256);
      expect(
        sqlite.prepare("SELECT COUNT(*) AS n FROM hsk_syllabus_items").get(),
      ).toEqual({ n: 0 });
      expect(protectedHash(sqlite)).toBe(before);
      await importHsk30Bundle(db, bundle);
      expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
  it("rolls back a mid-import failure and supports retry", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const before = protectedHash(sqlite);
      sqlite.exec(
        "CREATE TRIGGER fail_source BEFORE INSERT ON hsk_syllabus_examples BEGIN SELECT RAISE(ABORT,'fixture interruption'); END;",
      );
      await expect(importHsk30Bundle(db, bundle)).rejects.toThrow(
        "fixture interruption",
      );
      expect(
        sqlite.prepare("SELECT COUNT(*) AS n FROM hsk_standard_versions").get(),
      ).toEqual({ n: 0 });
      expect(
        sqlite.prepare("SELECT COUNT(*) AS n FROM hsk_syllabus_items").get(),
      ).toEqual({ n: 0 });
      expect(protectedHash(sqlite)).toBe(before);
      sqlite.exec("DROP TRIGGER fail_source");
      expect((await importHsk30Bundle(db, bundle)).installed).toBe(true);
      const changed = { ...bundle, zipSha256: "a".repeat(64) };
      await expect(importHsk30Bundle(db, changed)).rejects.toThrow(
        "IMMUTABLE_HSK_VERSION_CONFLICT",
      );
      await expect(rollbackHsk30Import(db, "wrong")).rejects.toThrow(
        "ROLLBACK_VERSION_CHECKSUM_MISMATCH",
      );
      sqlite.exec(
        "UPDATE hsk_syllabus_items SET content_json='{}' WHERE source_id='HSK30-2025-VOC-HSK1-00001'",
      );
      await expect(importHsk30Bundle(db, bundle)).rejects.toThrow(
        "HSK_SOURCE_CONTENT_CHANGED",
      );
    } finally {
      sqlite.close();
    }
  });
  it("upgrades an existing v44 installation without vocabulary/example/learner rewrites and skips repeat imports", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.exec("PRAGMA user_version=44");
      const word = sqlite
        .prepare("SELECT * FROM vocabulary WHERE id='hsk-1-ni'")
        .get();
      const custom = sqlite
        .prepare("SELECT * FROM vocabulary WHERE id='custom-1'")
        .get();
      const examples = sqlite.prepare("SELECT * FROM example_sentence").all();
      const progress = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      const history = sqlite.prepare("SELECT * FROM review_log").all();
      await initializeDatabase(db);
      expect(
        sqlite.prepare("SELECT * FROM vocabulary WHERE id='hsk-1-ni'").get(),
      ).toEqual(word);
      expect(
        sqlite.prepare("SELECT * FROM vocabulary WHERE id='custom-1'").get(),
      ).toEqual(custom);
      expect(
        sqlite
          .prepare("SELECT * FROM example_sentence WHERE id='example-1'")
          .all(),
      ).toEqual(examples);
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(progress);
      expect(sqlite.prepare("SELECT * FROM review_log").all()).toEqual(history);
      const imported = sqlite
        .prepare("SELECT * FROM hsk_syllabus_imports")
        .all();
      await initializeDatabase(db);
      expect(
        sqlite.prepare("SELECT * FROM hsk_syllabus_imports").all(),
      ).toEqual(imported);
      expect(sqlite.prepare("PRAGMA user_version").get()).toEqual({
        user_version: 45,
      });
    } finally {
      sqlite.close();
    }
  });
  it("fresh install retains the original dictionary while making the new source accessible", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      await initializeDatabase(expoAdapter(sqlite));
      expect(
        sqlite.prepare("SELECT COUNT(*) AS n FROM hsk_syllabus_items").get(),
      ).toEqual({ n: 16986 });
      expect(
        sqlite.prepare("SELECT COUNT(*) AS n FROM hsk_syllabus_examples").get(),
      ).toEqual({ n: 2059 });
      expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
