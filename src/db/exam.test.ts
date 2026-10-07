import { describe, expect, it } from "vitest";

import { exportLocalBackup, importLocalBackup } from "./backup-repository";
import {
  createExamAttempt,
  getExamAttempt,
  saveExamAttempt,
  submitExamAttempt,
} from "./exam";
import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { migrateDatabaseSchema } from "./migrations";

import { draftPracticeBank } from "@/services/exam/draft-bank";
import type { ExamProfile, ExamQuestion } from "@/services/exam/engine";
import {
  buildOriginalPractice,
  originalPracticeBank,
} from "@/services/exam/practice-bank";
import {
  getExamRemaining,
  getExamResult,
  getExamCurrentIndex,
  validateExamBackupRecord,
} from "@/services/exam/session";

const profile: ExamProfile = {
  id: "fixture",
  name: "Fixture",
  level: "1",
  kind: "ORIGINAL_PRACTICE",
  verified: false,
  standardVersionId: null,
  sourceRef: null,
  durationSeconds: 300,
  sections: [{ skill: "READING", durationSeconds: 300, questionCount: 1 }],
};
const questions: ExamQuestion[] = [
  {
    id: "q",
    profileId: "fixture",
    skill: "READING",
    prompt: "Fixture",
    choices: ["A", "B"],
    correctIndex: 0,
    explanationVi: "Fixture",
    provenance: "CURATED",
  },
];
describe("durable offline exam attempts", () => {
  it("round-trips optional no-back state through existing backup without changing user progress", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      const bank = buildOriginalPractice(
        "original-reading-1-v1",
        10,
        "ALL",
        true,
      );
      const created = await createExamAttempt(
        db,
        bank.profile,
        bank.questions,
        1000,
      );
      const saved = await saveExamAttempt(
        db,
        created,
        { ...created.snapshot, currentIndex: 1 },
        2000,
      );
      const backup = await exportLocalBackup(db, "exam-v5-test");
      await importLocalBackup(db, backup);
      const restored = await getExamAttempt(db, created.id);
      expect(restored).toEqual(saved);
      await expect(
        saveExamAttempt(
          db,
          restored,
          { ...restored.snapshot, currentIndex: 0 },
          3000,
        ),
      ).rejects.toThrow("EXAM_NO_BACK");
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
  it("persists no-back policy/position across resume and blocks forged earlier answer/flag edits", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const bank = buildOriginalPractice(
        "original-reading-1-v1",
        15,
        "ALL",
        true,
      );
      let attempt = await createExamAttempt(
        db,
        bank.profile,
        bank.questions,
        1000,
      );
      const firstId = bank.questions[0]!.id;
      attempt = await saveExamAttempt(
        db,
        attempt,
        { answers: { [firstId]: 0 }, flaggedIds: [firstId], currentIndex: 1 },
        2000,
      );
      const resumed = await getExamAttempt(db, attempt.id);
      expect(resumed.snapshot.furthestIndex).toBe(1);
      expect(resumed.snapshot.profile.backNavigation).toBe("NO_BACK");
      await expect(
        saveExamAttempt(
          db,
          resumed,
          { ...resumed.snapshot, currentIndex: 0 },
          3000,
        ),
      ).rejects.toThrow("EXAM_NO_BACK");
      await expect(
        saveExamAttempt(
          db,
          resumed,
          { ...resumed.snapshot, answers: { [firstId]: 1 } },
          3000,
        ),
      ).rejects.toThrow("EXAM_NO_BACK");
      await expect(
        saveExamAttempt(
          db,
          resumed,
          { ...resumed.snapshot, flaggedIds: [] },
          3000,
        ),
      ).rejects.toThrow("EXAM_NO_BACK");
      const forged = { ...resumed.snapshot, currentIndex: 2, furthestIndex: 0 };
      attempt = await saveExamAttempt(db, resumed, forged, 4000);
      expect(attempt.snapshot.furthestIndex).toBe(2);
      const row = sqlite
        .prepare("SELECT * FROM exam_attempts WHERE id=?")
        .get(attempt.id) as Record<string, unknown>;
      expect(() => validateExamBackupRecord(row)).not.toThrow();
    } finally {
      sqlite.close();
    }
  });
  it("preserves V4 content and old profile IDs after new selection, duration and caller bank changes", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const original = originalPracticeBank[0]!;
      const old = await createExamAttempt(
        db,
        original.profile,
        original.questions,
        1000,
      );
      const bank = buildOriginalPractice(original.profile.id, 10, "READING");
      const created = await createExamAttempt(
        db,
        bank.profile,
        bank.questions,
        2000,
      );
      bank.questions[0]!.choices[0] = "Changed later";
      bank.profile.durationSeconds = 999;
      const resumed = await getExamAttempt(db, created.id);
      expect(resumed.snapshot.profile.durationSeconds).toBe(600);
      expect(resumed.snapshot.questions[0]!.choices[0]).not.toBe(
        "Changed later",
      );
      expect((await getExamAttempt(db, old.id)).snapshot).toEqual(old.snapshot);
      expect(old.snapshot.profile.id).toBe("original-reading-1-v1");
      expect(old.snapshot.furthestIndex).toBeUndefined();
      expect(
        getExamResult(await submitExamAttempt(db, old.id, 500000)).total,
      ).toBe(4);
    } finally {
      sqlite.close();
    }
  });
  it("never creates attempts from DRAFT candidates", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const draft = draftPracticeBank[0]!;
      await expect(
        createExamAttempt(db, draft.profile, draft.questions, 1000),
      ).rejects.toThrow("UNREVIEWED_QUESTION");
      expect(
        sqlite.prepare("SELECT count(*) AS count FROM exam_attempts").get(),
      ).toMatchObject({ count: 0 });
    } finally {
      sqlite.close();
    }
  });
  it("resumes a timed no-back section after backgrounding and remains idempotent under concurrent submits", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const multi: ExamProfile = {
        ...profile,
        backNavigation: "NO_BACK",
        navigation: "SECTION_TIMED",
        durationSeconds: 20,
        sections: [
          { skill: "READING", durationSeconds: 10, questionCount: 1 },
          { skill: "WRITING", durationSeconds: 10, questionCount: 1 },
        ],
      };
      const attempt = await createExamAttempt(
        db,
        multi,
        [questions[0]!, { ...questions[0]!, id: "w", skill: "WRITING" }],
        1000,
      );
      const index = getExamCurrentIndex(attempt, 11000);
      expect(index).toBe(1);
      const resumed = await saveExamAttempt(
        db,
        attempt,
        { ...attempt.snapshot, currentIndex: index },
        11000,
      );
      expect(
        (await getExamAttempt(db, resumed.id)).snapshot.furthestIndex,
      ).toBe(1);
      const submissions = await Promise.all([
        submitExamAttempt(db, resumed.id, 22000),
        submitExamAttempt(db, resumed.id, 24000),
      ]);
      expect(submissions[0]).toEqual(submissions[1]);
      expect(submissions[0]!.submittedAtMs).toBe(21000);
      expect(getExamResult(submissions[0]!).elapsedSeconds).toBe(20);
    } finally {
      sqlite.close();
    }
  });
  it("locks past and future sections even if a caller submits a forged edit", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const multi: ExamProfile = {
        ...profile,
        navigation: "SECTION_TIMED",
        durationSeconds: 20,
        sections: [
          { skill: "READING", durationSeconds: 10, questionCount: 1 },
          { skill: "WRITING", durationSeconds: 10, questionCount: 1 },
        ],
      };
      const bank: ExamQuestion[] = [
        questions[0]!,
        { ...questions[0]!, id: "w", skill: "WRITING" },
      ];
      let attempt = await createExamAttempt(db, multi, bank, 1000);
      await expect(
        saveExamAttempt(
          db,
          attempt,
          { answers: { w: 0 }, flaggedIds: [], currentIndex: 1 },
          2000,
        ),
      ).rejects.toThrow("EXAM_SECTION_CLOSED");
      attempt = await saveExamAttempt(
        db,
        attempt,
        { answers: { q: 0 }, flaggedIds: ["q"], currentIndex: 0 },
        2000,
      );
      await expect(
        saveExamAttempt(
          db,
          attempt,
          { answers: { q: 1, w: 0 }, flaggedIds: ["q"], currentIndex: 1 },
          11000,
        ),
      ).rejects.toThrow("EXAM_SECTION_CLOSED");
      attempt = await saveExamAttempt(
        db,
        attempt,
        { answers: { q: 0, w: 0 }, flaggedIds: ["q"], currentIndex: 1 },
        11000,
      );
      expect(
        getExamResult(
          await submitExamAttempt(db, attempt.id, 22000),
        ).sections.map((section) => section.correct),
      ).toEqual([1, 1]);
    } finally {
      sqlite.close();
    }
  });
  it("never accepts replacement content or an invalid clock from a caller", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const attempt = await createExamAttempt(db, profile, questions, 1000);
      const forged = {
        ...attempt.snapshot,
        profile: { ...profile, durationSeconds: 99999 },
        questions: [{ ...questions[0]!, correctIndex: 1 }],
        answers: { q: 0 },
      };
      const saved = await saveExamAttempt(db, attempt, forged, 2000);
      expect(saved.snapshot.profile).toEqual(profile);
      expect(saved.snapshot.questions).toEqual(questions);
      await expect(submitExamAttempt(db, saved.id, NaN)).rejects.toThrow(
        "INVALID_EXAM_CLOCK",
      );
      expect((await getExamAttempt(db, saved.id)).status).toBe("IN_PROGRESS");
    } finally {
      sqlite.close();
    }
  });
  it("resumes answers/flags and immutable content without changing SRS", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const before = sqlite
        .prepare("SELECT * FROM user_vocabulary_progress")
        .all();
      let attempt = await createExamAttempt(db, profile, questions, 1000);
      const original = attempt;
      attempt = await saveExamAttempt(
        db,
        attempt,
        { answers: { q: 0 }, flaggedIds: ["q"], currentIndex: 0 },
        2000,
      );
      expect((await getExamAttempt(db, attempt.id)).snapshot.answers).toEqual({
        q: 0,
      });
      expect(getExamRemaining(attempt, 61000)).toBe(240);
      await expect(
        saveExamAttempt(
          db,
          original,
          { answers: {}, flaggedIds: [], currentIndex: 0 },
          3000,
        ),
      ).rejects.toThrow("EXAM_STALE_WRITE");
      const submitted = await submitExamAttempt(db, attempt.id, 301000);
      expect(getExamResult(submitted).percent).toBe(100);
      expect((await submitExamAttempt(db, attempt.id, 400000)).revision).toBe(
        submitted.revision,
      );
      await expect(
        saveExamAttempt(
          db,
          submitted,
          { answers: {}, flaggedIds: [], currentIndex: 0 },
          301001,
        ),
      ).rejects.toThrow("EXAM_CLOSED");
      expect(
        sqlite.prepare("SELECT * FROM user_vocabulary_progress").all(),
      ).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
  it("rejects invalid answers and expires after app was closed", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const attempt = await createExamAttempt(db, profile, questions, 1000);
      await expect(
        saveExamAttempt(
          db,
          attempt,
          { answers: { q: 99 }, flaggedIds: [], currentIndex: 0 },
          2000,
        ),
      ).rejects.toThrow("INVALID_EXAM_ANSWER");
      await expect(
        saveExamAttempt(
          db,
          attempt,
          { answers: { q: 0 }, flaggedIds: [], currentIndex: 0 },
          301000,
        ),
      ).rejects.toThrow("EXAM_CLOSED");
      expect(
        getExamResult(await submitExamAttempt(db, attempt.id, 500000)),
      ).toMatchObject({ correct: 0, elapsedSeconds: 300 });
    } finally {
      sqlite.close();
    }
  });
});
