import { describe, expect, it } from "vitest";

import { exportLocalBackup, importLocalBackup } from "./backup-repository";
import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrateDatabaseSchema } from "./migrations";
import {
  loadWrittenAttempt,
  openWrittenDraft,
  saveWrittenAttempt,
} from "./written-practice";

import { writtenExercises } from "@/data/written-practice";

describe("durable written drafts", () => {
  it("resumes, locks completed snapshots and round-trips backup without changing SRS", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      const exercise = writtenExercises[0]!;
      const first = await openWrittenDraft(db, exercise);
      const saved = await saveWrittenAttempt(db, first, "我叫小明。我是学生。");
      expect((await openWrittenDraft(db, exercise)).id).toBe(first.id);
      await expect(saveWrittenAttempt(db, first, "stale")).rejects.toThrow(
        "WRITTEN_STALE_WRITE",
      );
      const done = await saveWrittenAttempt(db, saved, saved.answer, true);
      await expect(saveWrittenAttempt(db, done, "changed")).rejects.toThrow(
        "WRITTEN_STALE_WRITE",
      );
      const backup = await exportLocalBackup(db, "test");
      sqlite
        .prepare("UPDATE written_practice SET answer=? WHERE id=?")
        .run("changed", done.id);
      await importLocalBackup(db, backup);
      expect((await loadWrittenAttempt(db, done.id)).answer).toBe(done.answer);
      delete backup.data.writtenPractice;
      await importLocalBackup(db, backup);
      expect((await loadWrittenAttempt(db, done.id)).status).toBe("REVIEWED");
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
      expect((await openWrittenDraft(db, exercise)).id).not.toBe(done.id);
    } finally {
      sqlite.close();
    }
  });
  it("rejects oversized/empty reviewed answers and malformed backups before deleting anything", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const attempt = await openWrittenDraft(db, writtenExercises[0]!);
      await expect(saveWrittenAttempt(db, attempt, "", true)).rejects.toThrow(
        "INVALID_WRITTEN_ANSWER",
      );
      await expect(
        saveWrittenAttempt(db, attempt, "a".repeat(12001)),
      ).rejects.toThrow("INVALID_WRITTEN_ANSWER");
      const backup = await exportLocalBackup(db, "test");
      backup.data.writtenPractice![0]!.snapshot_json = "{}";
      await expect(importLocalBackup(db, backup)).rejects.toThrow();
      expect((await loadWrittenAttempt(db, attempt.id)).revision).toBe(0);
    } finally {
      sqlite.close();
    }
  });
});
