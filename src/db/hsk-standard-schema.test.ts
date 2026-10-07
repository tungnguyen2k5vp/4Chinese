import { describe, expect, it } from "vitest";

import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrationV32Sql } from "./hsk-standard-schema";
import { migrateDatabaseSchema } from "./migrations";

describe("V32 non-destructive HSK reference infrastructure", () => {
  it("upgrades a v31 database and leaves every existing row byte-for-byte equivalent", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.exec("PRAGMA user_version=31");
      const tables = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .all() as { name: string }[];
      const snapshot = () =>
        Object.fromEntries(
          tables.map(({ name }) => [
            name,
            sqlite.prepare(`SELECT * FROM "${name}" ORDER BY 1`).all(),
          ]),
        );
      const before = snapshot();
      expect(await migrateDatabaseSchema(db)).toBe(31);
      expect(snapshot()).toEqual(before);
      sqlite.exec(migrationV32Sql);
      expect(snapshot()).toEqual(before);
      expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
  it("enforces reference dimensions and status constraints", async () => {
    const sqlite = createLegacyDatabase();
    try {
      await migrateDatabaseSchema(expoAdapter(sqlite));
      sqlite.exec(
        "INSERT INTO hsk_standard_versions VALUES ('fixture','Fixture','1',NULL,'fixture','UNVERIFIED','2026-10-01')",
      );
      expect(() =>
        sqlite.exec(
          "INSERT INTO hsk_reference_entries VALUES ('fixture','FAKE','x','1','{}','fixture')",
        ),
      ).toThrow();
      expect(
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM hsk_reference_entries")
          .get(),
      ).toEqual({ count: 0 });
    } finally {
      sqlite.close();
    }
  });
});
