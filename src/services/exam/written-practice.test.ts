import { describe, expect, it } from "vitest";

import {
  checkWrittenAnswer,
  createTimedWrittenExercise,
  getWrittenRemainingSeconds,
  getWrittenSelfReview,
  validateWrittenExercise,
  writtenPracticeMinutes,
  type WrittenExercise,
  type WrittenPracticeMinutes,
} from "./written-practice";

import { writtenExercises } from "@/data/written-practice";

describe("original written practice", () => {
  it("has original tasks across all seven bands and both modes, without official claims", () => {
    expect(new Set(writtenExercises.map((item) => item.id)).size).toBe(42);
    for (const level of ["1", "2", "3", "4", "5", "6", "7-9"]) {
      expect(
        writtenExercises.filter((item) => item.level === level),
      ).toHaveLength(6);
    }
    writtenExercises.forEach((item) => {
      expect(() => validateWrittenExercise(item)).not.toThrow();
      expect(item.reviewStatus).toBe("UNREVIEWED");
    });
  });
  it.each(writtenPracticeMinutes)(
    "persists a %s-minute wall-clock budget in a separate snapshot",
    (minutes) => {
      const original = writtenExercises[0]!;
      const before = JSON.stringify(original);
      const timed = createTimedWrittenExercise(original, minutes, 1000);
      expect(timed.id).toBe(`${original.id}-timed-${minutes}m-rs`);
      expect(timed.timing?.deadlineAtMs).toBe(1000 + minutes * 60000);
      expect(getWrittenRemainingSeconds(timed, 1000)).toBe(minutes * 60);
      expect(getWrittenRemainingSeconds(timed, 2001)).toBe(minutes * 60 - 1);
      expect(getWrittenRemainingSeconds(timed, 1000 + minutes * 60000)).toBe(0);
      expect(getWrittenRemainingSeconds(timed, 99999999)).toBe(0);
      expect(getWrittenRemainingSeconds(timed, 0)).toBe(minutes * 60);
      expect(JSON.stringify(original)).toBe(before);
      expect(getWrittenRemainingSeconds(original, 1000)).toBeNull();
      expect(() => createTimedWrittenExercise(timed, 5, 5000)).toThrow(
        "WRITTEN_TIMER_ALREADY_STARTED",
      );
    },
  );
  it("rejects unsupported durations/clocks and tampered timing/provenance", () => {
    const original = writtenExercises[0]!;
    expect(() =>
      createTimedWrittenExercise(original, 7 as WrittenPracticeMinutes, 1000),
    ).toThrow("INVALID_WRITTEN_DURATION");
    expect(() => createTimedWrittenExercise(original, 5, NaN)).toThrow(
      "INVALID_WRITTEN_CLOCK",
    );
    expect(() => createTimedWrittenExercise(original, 5, -1)).toThrow(
      "INVALID_WRITTEN_CLOCK",
    );
    const timed = createTimedWrittenExercise(original, 5, 1000);
    expect(() =>
      validateWrittenExercise({
        ...timed,
        timing: { ...timed.timing!, deadlineAtMs: 999999 },
      }),
    ).toThrow("INVALID_WRITTEN_TIMING");
    expect(() =>
      validateWrittenExercise({ ...timed, id: original.id }),
    ).toThrow("INVALID_WRITTEN_TIMING");
    expect(() =>
      validateWrittenExercise({
        ...original,
        reviewStatus: "VERIFIED",
      } as unknown as WrittenExercise),
    ).toThrow("INVALID_WRITTEN_EXERCISE");
    expect(() =>
      validateWrittenExercise({
        ...original,
        provenance: "OFFICIAL",
      } as unknown as WrittenExercise),
    ).toThrow("INVALID_WRITTEN_EXERCISE");
    expect(() =>
      validateWrittenExercise({ ...original, modelAnswer: " " }),
    ).toThrow("INVALID_WRITTEN_EXERCISE");
    expect(() =>
      validateWrittenExercise({ ...original, checklist: ["same", "same"] }),
    ).toThrow("INVALID_WRITTEN_EXERCISE");
  });
  it("does not disclose samples/checklists/notes before explicit self-submission, even after expiry", () => {
    const timed = createTimedWrittenExercise(writtenExercises[0]!, 5, 1000);
    expect(getWrittenRemainingSeconds(timed, 301000)).toBe(0);
    expect(
      getWrittenSelfReview(timed, "我叫安。我是学生。", "DRAFT"),
    ).toBeNull();
    expect(
      getWrittenSelfReview(timed, "我叫安。我是学生。", "REVIEWED"),
    ).toMatchObject({
      modelAnswer: timed.modelAnswer,
      checklist: timed.checklist,
      note: timed.note,
    });
    expect(() => getWrittenSelfReview(timed, " ", "REVIEWED")).toThrow(
      "INVALID_WRITTEN_ANSWER",
    );
  });
  it("counts Hanzi only and reports missing words, not an exact-match grade", () => {
    const exercise = writtenExercises[0]!;
    expect(checkWrittenAnswer(exercise, "我叫安。我是学生。123")).toMatchObject(
      { length: 7, missingWords: [], hasSentenceEnding: false },
    );
    expect(checkWrittenAnswer(exercise, "你好！")).toMatchObject({
      length: 2,
      missingWords: ["我"],
      lengthInRange: false,
    });
    expect(
      checkWrittenAnswer(
        writtenExercises[7]!,
        "Mỗi ngày tôi đến trường lúc bảy giờ.",
      ).unit,
    ).toBe("từ");
  });
});
