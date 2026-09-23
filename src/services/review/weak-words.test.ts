import { describe, expect, it } from "vitest";

import { assessWeakness, isWeakWord } from "./weak-words";

const base = {
  reviewCount: 8,
  correctCount: 8,
  wrongCount: 0,
  lapseCount: 0,
  consecutiveWrong: 0,
  hintUsedCount: 0,
  nextReviewAt: "2026-09-22T00:00:00.000Z",
};

describe("weak word assessment", () => {
  it("does not mark a consistently correct word as weak", () => {
    expect(isWeakWord(base)).toBe(false);
    expect(assessWeakness(base).reasons).toEqual([]);
  });

  it("prioritizes repeated failures over a single old mistake", () => {
    const repeated = assessWeakness({
      ...base,
      correctCount: 3,
      wrongCount: 5,
      lapseCount: 2,
      consecutiveWrong: 2,
    });
    const oldMistake = assessWeakness({ ...base, wrongCount: 1, lapseCount: 1 });

    expect(isWeakWord({ ...base, wrongCount: 5, lapseCount: 2, consecutiveWrong: 2, correctCount: 3 })).toBe(true);
    expect(repeated.score).toBeGreaterThan(oldMistake.score);
    expect(repeated.reasons).toContain("Sai liên tiếp 2 lần");
  });

  it("marks one explicit not-remembered response as needing reinforcement", () => {
    expect(isWeakWord({ ...base, consecutiveWrong: 1 })).toBe(true);
  });

  it("surfaces low accuracy and repeated hint use as learner-facing reasons", () => {
    const result = assessWeakness({
      ...base,
      correctCount: 3,
      wrongCount: 5,
      hintUsedCount: 4,
    });

    expect(result.reasons).toContain("Độ chính xác 38%");
    expect(result.reasons).toContain("Đã dùng gợi ý 4 lần");
  });
});
