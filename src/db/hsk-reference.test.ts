import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { importHskVocabularyReference } from "./hsk-reference";
import { migrateDatabaseSchema } from "./migrations";

const version = {
  id: "fixture-reference",
  name: "Fixture, not official",
  version: "1",
  effectiveDate: null,
  source: "fixture",
};
const entries = [
  {
    identifier: "fixture-ni",
    simplified: "你",
    pinyinNumeric: "ni3",
    level: "1" as const,
    sourceRef: "fixture",
  },
];
describe("transactional HSK reference import", () => {
  it("imports a reference without modifying vocabulary, SRS or custom decks", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      const vocabulary = sqlite
        .prepare("SELECT * FROM vocabulary ORDER BY id")
        .all();
      const report = await importHskVocabularyReference(db, version, entries);
      expect(report.matched).toBe(1);
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
      expect(
        sqlite.prepare("SELECT * FROM vocabulary ORDER BY id").all(),
      ).toEqual(vocabulary);
      expect(
        sqlite.prepare("SELECT status FROM hsk_standard_versions").get(),
      ).toEqual({ status: "UNVERIFIED" });
      await expect(
        importHskVocabularyReference(db, version, entries),
      ).rejects.toThrow("HSK_REFERENCE_VERSION_ALREADY_EXISTS");
      expect(
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM hsk_reference_entries")
          .get(),
      ).toEqual({ count: 1 });
    } finally {
      sqlite.close();
    }
  });
  it("rolls back a partial import without changing user rows", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      sqlite.exec(`CREATE TRIGGER fixture_interrupt BEFORE INSERT ON hsk_vocabulary_alignment
        BEGIN SELECT RAISE(ABORT,'SIMULATED_INTERRUPTION'); END;`);
      await expect(
        importHskVocabularyReference(db, version, entries),
      ).rejects.toThrow("SIMULATED_INTERRUPTION");
      expect(
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM hsk_standard_versions")
          .get(),
      ).toEqual({ count: 0 });
      expect(
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM hsk_reference_entries")
          .get(),
      ).toEqual({ count: 0 });
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
});
