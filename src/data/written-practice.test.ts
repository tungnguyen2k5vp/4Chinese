import { describe, expect, it } from "vitest";

import { writtenExercises } from "./written-practice";

import {
  checkWrittenAnswer,
  validateWrittenExercise,
} from "@/services/exam/written-practice";

describe("V5 original written/translation bank", () => {
  it("has at least three original UNREVIEWED prompts for every skill/teaching band", () => {
    expect(writtenExercises).toHaveLength(42);
    expect(new Set(writtenExercises.map((exercise) => exercise.id)).size).toBe(
      42,
    );
    for (const level of ["1", "2", "3", "4", "5", "6", "7-9"])
      for (const kind of ["WRITING", "TRANSLATION"])
        expect(
          writtenExercises.filter(
            (exercise) => exercise.level === level && exercise.kind === kind,
          ),
        ).toHaveLength(3);
    for (const exercise of writtenExercises) {
      expect(() => validateWrittenExercise(exercise)).not.toThrow();
      expect(exercise.reviewStatus).toBe("UNREVIEWED");
      expect(exercise.sourceType).toBe("CURATED");
      expect(exercise.checklist.length).toBeGreaterThanOrEqual(3);
      expect(exercise.timing).toBeUndefined();
    }
    expect(
      writtenExercises.filter(
        (exercise) => exercise.provenance === "ORIGINAL_AI_ASSISTED",
      ),
    ).toHaveLength(28);
  });
  it("preserves all fourteen legacy IDs, ordering and samples without upgrading review status", () => {
    expect(
      writtenExercises.slice(0, 14).map((exercise) => exercise.id),
    ).toEqual([
      "write-1-introduction",
      "write-2-correction",
      "write-3-expansion",
      "write-4-email",
      "write-5-paragraph",
      "write-6-argument",
      "write-79-policy",
      "translate-1-zhvi",
      "translate-2-vizh",
      "translate-3-zhvi",
      "translate-4-vizh",
      "translate-5-summary",
      "translate-6-vizh",
      "translate-79-zhvi",
    ]);
    expect(writtenExercises[0]!.modelAnswer).toBe("我叫小明。我是学生。");
    expect(writtenExercises[7]!.modelAnswer).toBe(
      "Mỗi ngày tôi đến trường lúc bảy giờ.",
    );
    expect(
      writtenExercises
        .slice(0, 14)
        .every(
          (exercise) =>
            exercise.provenance === undefined && exercise.timing === undefined,
        ),
    ).toBe(true);
  });
  it("covers both translation directions in every teaching band with task-specific checklists", () => {
    for (const level of ["1", "2", "3", "4", "5", "6", "7-9"]) {
      const translations = writtenExercises.filter(
        (exercise) =>
          exercise.level === level && exercise.kind === "TRANSLATION",
      );
      expect(
        new Set(translations.map((exercise) => exercise.answerLanguage)),
      ).toEqual(new Set(["ZH", "VI"]));
    }
    const additions = writtenExercises.slice(14);
    expect(new Set(additions.map((exercise) => exercise.prompt)).size).toBe(28);
    expect(
      new Set(additions.map((exercise) => exercise.checklist.join("|"))).size,
    ).toBe(28);
    for (const exercise of additions) {
      expect(`${exercise.prompt} ${exercise.modelAnswer}`).not.toMatch(
        /Tôi đang học từ|Đây là ví dụ của từ|我正在学习这个词/u,
      );
      expect(
        exercise.checklist.every((line) => /[ăâđêôơưáàảãạếềểễệ]/iu.test(line)),
      ).toBe(true);
    }
  });
  it.each(
    writtenExercises
      .slice(14)
      .map((exercise) => [exercise.id, exercise] as const),
  )("sample for %s passes only the stated surface checks", (_, exercise) => {
    const check = checkWrittenAnswer(exercise, exercise.modelAnswer);
    expect(
      check.lengthInRange,
      `${exercise.id}: ${check.length} ${check.unit}, expected ${exercise.minLength}–${exercise.maxLength}`,
    ).toBe(true);
    expect(check.missingWords).toEqual([]);
    expect(check.hasSentenceEnding).toBe(true);
  });
});
