import { describe, expect, it } from "vitest";

import {
  createTimedWrittenExercise,
  getWrittenRemainingSeconds,
  getWrittenSelfReview,
  type WrittenExercise,
} from "./written-practice";

import { writtenExercises } from "@/data/written-practice";
import { exportLocalBackup, importLocalBackup } from "@/db/backup-repository";
import {
  createLegacyDatabase,
  expoAdapter,
} from "@/db/fixtures/legacy_database";
import { migrateDatabaseSchema } from "@/db/migrations";
import {
  loadWrittenAttempt,
  openWrittenDraft,
  saveWrittenAttempt,
} from "@/db/written-practice";

describe("V5 written timing in existing immutable snapshots", () => {
  it("resumes saved deadline/draft after restart and never changes the legacy snapshot", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const legacyExercise = writtenExercises[0]!;
      const legacy = await openWrittenDraft(db, legacyExercise);
      const timer = createTimedWrittenExercise(legacyExercise, 10, 1000);
      const first = await openWrittenDraft(db, timer);
      const saved = await saveWrittenAttempt(db, first, "我想喝水。");
      const restarted = await loadWrittenAttempt(db, saved.id);
      const snapshot = JSON.parse(restarted.snapshot_json) as WrittenExercise;
      expect(restarted.answer).toBe("我想喝水。");
      expect(snapshot.timing?.deadlineAtMs).toBe(601000);
      expect(getWrittenRemainingSeconds(snapshot, 301000)).toBe(300);
      expect((await openWrittenDraft(db, timer)).id).toBe(first.id);
      expect((await loadWrittenAttempt(db, legacy.id)).snapshot_json).toBe(
        legacy.snapshot_json,
      );
      expect(
        getWrittenRemainingSeconds(
          JSON.parse(legacy.snapshot_json) as WrittenExercise,
          301000,
        ),
      ).toBeNull();
      timer.modelAnswer = "caller changed later";
      timer.timing!.deadlineAtMs = 99999999;
      expect((await loadWrittenAttempt(db, first.id)).snapshot_json).toBe(
        first.snapshot_json,
      );
    } finally {
      sqlite.close();
    }
  });
  it("keeps an expired draft undisclosed until explicit review and opens later starts as separate attempts", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const timer = createTimedWrittenExercise(writtenExercises[0]!, 5, 1000);
      const first = await openWrittenDraft(db, timer);
      const saved = await saveWrittenAttempt(db, first, "我叫安。我是学生。");
      const expired = await loadWrittenAttempt(db, saved.id);
      const snapshot = JSON.parse(expired.snapshot_json) as WrittenExercise;
      expect(getWrittenRemainingSeconds(snapshot, 301000)).toBe(0);
      expect(expired.status).toBe("DRAFT");
      expect(
        getWrittenSelfReview(snapshot, expired.answer, expired.status),
      ).toBeNull();
      const next = await openWrittenDraft(
        db,
        createTimedWrittenExercise(writtenExercises[0]!, 5, 302000),
      );
      expect(next.id).not.toBe(expired.id);
      expect(next.exercise_id).not.toBe(expired.exercise_id);
      expect((await loadWrittenAttempt(db, expired.id)).snapshot_json).toBe(
        expired.snapshot_json,
      );
      const reviewed = await saveWrittenAttempt(
        db,
        expired,
        expired.answer,
        true,
      );
      expect(
        getWrittenSelfReview(snapshot, reviewed.answer, reviewed.status)
          ?.modelAnswer,
      ).toBe(snapshot.modelAnswer);
      await expect(saveWrittenAttempt(db, reviewed, "changed")).rejects.toThrow(
        "WRITTEN_STALE_WRITE",
      );
    } finally {
      sqlite.close();
    }
  });
  it("round-trips timing in existing backup and rejects corrupt optional deadlines before data mutation", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      const exercise = createTimedWrittenExercise(
        writtenExercises[14]!,
        15,
        1000,
      );
      const created = await openWrittenDraft(db, exercise);
      const saved = await saveWrittenAttempt(
        db,
        created,
        "我今天早上想吃面包。",
      );
      const backup = await exportLocalBackup(db, "written-v5-test");
      await importLocalBackup(db, backup);
      expect(await loadWrittenAttempt(db, saved.id)).toEqual(saved);
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
      const row = backup.data.writtenPractice!.find(
        (item) => item.id === saved.id,
      )!;
      const corrupt = JSON.parse(
        row.snapshot_json as string,
      ) as WrittenExercise;
      corrupt.timing!.deadlineAtMs += 1;
      row.snapshot_json = JSON.stringify(corrupt);
      await expect(importLocalBackup(db, backup)).rejects.toThrow();
      expect(await loadWrittenAttempt(db, saved.id)).toEqual(saved);
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
});
