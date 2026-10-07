import { describe, expect, it } from "vitest";

import { createExamAttempt, submitExamAttempt } from "./exam";
import { createLegacyDatabase, expoAdapter } from "./fixtures/legacy_database";
import { getHskPreparation } from "./hsk-preparation";
import { migrateDatabaseSchema } from "./migrations";

import { originalPracticeBank } from "@/services/exam/practice-bank";

describe("honest internal preparation summary", () => {
  it("shows zero samples as zero, counts completed attempts and never derives an official score", async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const first = (await getHskPreparation(db))[0]!;
      expect(first.submittedMiniTests).toBe(0);
      expect(first.recentQuestions).toBe(0);
      expect(first).not.toHaveProperty("officialScore");
      const bank = originalPracticeBank[0]!;
      const attempt = await createExamAttempt(
        db,
        bank.profile,
        bank.questions,
        1000,
      );
      await submitExamAttempt(db, attempt.id, 2000);
      expect((await getHskPreparation(db))[0]).toMatchObject({
        submittedMiniTests: 1,
        recentMiniTests: 1,
        recentCorrect: 0,
        recentQuestions: 4,
      });
    } finally {
      sqlite.close();
    }
  });
});
