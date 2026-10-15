import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it, vi } from "vitest";

import { expoAdapter } from "./fixtures/legacy_database";
import { snapshotHskDatabaseFile } from "./hsk30-startup";

vi.mock("./database", () => ({ initializeDatabase: vi.fn() }));
vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: vi.fn(),
  backupDatabaseAsync: vi.fn(),
}));

describe("native pre-HSK file snapshot", () => {
  it("copies committed WAL data, preserves IDs and source, refuses occupied snapshot", async () => {
    const directory = mkdtempSync(join(tmpdir(), "hsk-snapshot-qa-"));
    const sourcePath = join(directory, "hanzi30.db").replaceAll("\\", "/");
    const sqlite = new DatabaseSync(sourcePath);
    try {
      sqlite.exec(
        "PRAGMA journal_mode=WAL; PRAGMA user_version=44; CREATE TABLE user_progress(id TEXT PRIMARY KEY, notes TEXT, xp INTEGER); INSERT INTO user_progress VALUES('original-id','learner note',123);",
      );
      const db = Object.assign(expoAdapter(sqlite), {
        databasePath: sourcePath,
      });
      const before = sqlite.prepare("SELECT * FROM user_progress").all();
      const name = "hanzi30-pre-hsk30-qa.db";
      await snapshotHskDatabaseFile(db, name);
      const copy = new DatabaseSync(join(directory, name), { readOnly: true });
      try {
        expect(copy.prepare("SELECT * FROM user_progress").all()).toEqual(
          before,
        );
        expect(copy.prepare("PRAGMA user_version").get()?.user_version).toBe(
          44,
        );
        expect(copy.prepare("PRAGMA quick_check").get()?.quick_check).toBe(
          "ok",
        );
      } finally {
        copy.close();
      }
      expect(sqlite.prepare("SELECT * FROM user_progress").all()).toEqual(
        before,
      );
      await expect(snapshotHskDatabaseFile(db, name)).rejects.toThrow();
      expect(sqlite.prepare("SELECT * FROM user_progress").all()).toEqual(
        before,
      );
      expect(sqlite.prepare("PRAGMA database_list").all()).toHaveLength(1);
    } finally {
      sqlite.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("rejects filename/path injection before executing SQL", async () => {
    const sqlite = new DatabaseSync(":memory:");
    try {
      const db = Object.assign(expoAdapter(sqlite), {
        databasePath: "/safe/hanzi30.db",
      });
      await expect(snapshotHskDatabaseFile(db, "../target.db")).rejects.toThrow(
        "INVALID_HSK_BACKUP_NAME",
      );
      await expect(
        snapshotHskDatabaseFile(
          Object.assign(db, { databasePath: ":memory:" }),
          "hanzi30-pre-hsk30-qa.db",
        ),
      ).rejects.toThrow("INVALID_HSK_DATABASE_PATH");
    } finally {
      sqlite.close();
    }
  });
});
