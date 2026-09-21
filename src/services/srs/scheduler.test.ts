import { describe, expect, it } from "vitest";

import {
  applyReview,
  formatDueInterval,
  getReviewMode,
  initialLearningSchedule,
  isDifficult,
  isReviewDue,
  knownStatusSchedule,
  knownWordSchedule,
  wrongLevel,
} from "./scheduler";

const now = new Date("2026-01-01T00:00:00.000Z");
const base = {
  memoryLevel: 1,
  deepMemoryStage: 0,
  reviewCount: 0,
  correctCount: 0,
  wrongCount: 0,
  lapseCount: 0,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  hintUsedCount: 0,
  averageResponseTimeMs: 0,
  lastResponseTimeMs: 0,
  isKnown: false,
};

describe("level spaced repetition", () => {
  it("starts a learned word at level 1 with a 30 minute due date", () => {
    expect(initialLearningSchedule(now)).toEqual({
      memoryLevel: 1,
      deepMemoryStage: 0,
      nextReviewAt: "2026-01-01T00:30:00.000Z",
    });
  });

  it("keeps the first exposure out of the due queue until its scheduled review", () => {
    const initial = initialLearningSchedule(now);
    const learning = {
      nextReviewAt: initial.nextReviewAt,
      isSuspended: false,
      status: "LEARNING" as const,
      studied: true,
    };
    expect(isReviewDue(learning, now)).toBe(false);
    expect(isReviewDue(learning, new Date("2026-01-01T00:30:00.000Z"))).toBe(true);
    const review = applyReview(
      { ...base, memoryLevel: initial.memoryLevel },
      { correct: true, responseTimeMs: 8_000 },
      new Date("2026-01-01T00:30:00.000Z"),
    );
    expect(review.memoryLevel).toBe(2);
    expect(review.reviewCount).toBe(1);
    expect(knownStatusSchedule(now).memoryLevel).toBe(0);
  });

  it.each([
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 3],
    [4, 5, 5],
  ])("moves level %i to %i after a correct answer", (level, expected, days) => {
    const result = applyReview(
      { ...base, memoryLevel: level },
      { correct: true, responseTimeMs: 8_000 },
      now,
    );
    expect(result.memoryLevel).toBe(expected);
    expect(new Date(result.nextReviewAt).getTime() - now.getTime()).toBe(
      days * 86_400_000,
    );
  });

  it("enters and advances deep memory", () => {
    const deep = applyReview(
      { ...base, memoryLevel: 5 },
      { correct: true, responseTimeMs: 8_000 },
      now,
    );
    expect([deep.memoryLevel, deep.deepMemoryStage, deep.nextReviewAt]).toEqual(
      [6, 0, "2026-01-09T00:00:00.000Z"],
    );
    const next = applyReview(
      deep,
      { correct: true, responseTimeMs: 8_000 },
      now,
    );
    expect([next.deepMemoryStage, next.nextReviewAt]).toEqual([
      1,
      "2026-01-17T00:00:00.000Z",
    ]);
  });

  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 4],
  ])("drops level %i to %i after a wrong answer", (level, expected) => {
    expect(wrongLevel(level)).toBe(expected);
  });

  it("returns a word to level 1 after three failed practice attempts", () => {
    const result = applyReview(
      { ...base, memoryLevel: 5 },
      { correct: false, forceLevelOne: true, responseTimeMs: 8_000 },
      now,
    );
    expect(result.memoryLevel).toBe(1);
    expect(result.nextReviewAt).toBe("2026-01-01T00:30:00.000Z");
  });

  it("keeps the level and halves interval when a hint was used", () => {
    const result = applyReview(
      { ...base, memoryLevel: 4 },
      { correct: true, hintUsed: true, responseTimeMs: 9_000 },
      now,
    );
    expect(result.memoryLevel).toBe(4);
    expect(result.nextReviewAt).toBe("2026-01-02T12:00:00.000Z");
    expect(result.hintUsedCount).toBe(1);
  });

  it("accepts the compose mode usedHint alias", () => {
    const result = applyReview(
      { ...base, memoryLevel: 3 },
      { correct: true, usedHint: true, responseTimeMs: 8_000 },
      now,
    );
    expect(result.memoryLevel).toBe(3);
    expect(result.hintUsedCount).toBe(1);
  });

  it("detects difficult words and rotates writing only when eligible", () => {
    expect(
      isDifficult({
        reviewCount: 5,
        wrongCount: 2,
        lapseCount: 2,
        consecutiveWrong: 1,
      }),
    ).toBe(true);
    const early = Array.from({ length: 20 }, (_, reviewCount) =>
      getReviewMode({ memoryLevel: 2, reviewCount }, `w${reviewCount}`),
    );
    expect(early).not.toContain("writing");
    expect(early).toContain("hanzi-recall-pinyin-compose");
    const mature = Array.from({ length: 20 }, (_, reviewCount) =>
      getReviewMode({ memoryLevel: 4, reviewCount }, `w${reviewCount}`),
    );
    expect(mature).toContain("writing");
  });

  it("does not make the compose mode deterministic for every level-2 card", () => {
    const modes = Array.from({ length: 25 }, (_, reviewCount) =>
      getReviewMode({ memoryLevel: 2, reviewCount }, `compose-${reviewCount}`),
    );
    expect(modes).toContain("hanzi-recall-pinyin-compose");
    expect(modes.some((mode) => mode !== "hanzi-recall-pinyin-compose")).toBe(true);
  });

  it("keeps known words separate from deep memory", () => {
    expect(knownWordSchedule(now)).toEqual({
      memoryLevel: 0,
      deepMemoryStage: 0,
      nextReviewAt: "2026-01-09T00:00:00.000Z",
    });
  });

  it("filters future and suspended reviews using timezone-safe instants", () => {
    expect(isReviewDue({ nextReviewAt: "2026-01-01T07:00:00+07:00", isSuspended: false }, now)).toBe(true);
    expect(isReviewDue({ nextReviewAt: "2026-01-01T00:01:00.000Z", isSuspended: false }, now)).toBe(false);
    expect(isReviewDue({ nextReviewAt: "2025-12-31T00:00:00.000Z", isSuspended: true }, now)).toBe(false);
  });

  it("always shows the precise next-review interval in minutes", () => {
    expect(formatDueInterval("2026-01-01T00:30:00.000Z", now)).toBe("30 phút");
    expect(formatDueInterval("2026-01-02T00:00:00.000Z", now)).toBe("1.440 phút (≈ 1 ngày)");
    expect(formatDueInterval("2025-12-31T23:59:00.000Z", now)).toBe("Đến hạn ôn");
  });
});
