import { describe, expect, it } from "vitest";

import { parseReviewLevelChanges } from "@/services/review/result-summary";

const valid = {
  id: "word-a",
  hanzi: "食堂",
  pinyin: "shítáng",
  meaning: "nhà ăn",
  levelBefore: 1,
  levelAfter: 2,
  nextReviewAt: "2026-10-14T10:00:00.000Z",
  direction: "up",
};

describe("review result level-change payload", () => {
  it("parses valid rows and drops duplicate word ids", () => {
    expect(parseReviewLevelChanges(JSON.stringify([valid, valid]))).toEqual([valid]);
  });

  it("rejects malformed, stale, and oversized route payloads safely", () => {
    expect(parseReviewLevelChanges("not json")).toEqual([]);
    expect(parseReviewLevelChanges("x".repeat(32_001))).toEqual([]);
    expect(parseReviewLevelChanges(JSON.stringify([{ ...valid, levelAfter: 9 }]))).toEqual([]);
  });
});
