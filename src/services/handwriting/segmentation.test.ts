import { describe, expect, it } from "vitest";

import { combineCharacterCandidates, segmentStrokesByWritingOrder } from "./segmentation";

const stroke = (start: number, end: number) => ({
  points: [{ x: 0, y: 0, t: start }, { x: 1, y: 1, t: end }],
});

describe("handwriting segmentation", () => {
  it("splits at the longest pause between characters", () => {
    const result = segmentStrokesByWritingOrder(
      [stroke(0, 10), stroke(12, 20), stroke(100, 110), stroke(112, 120)],
      2,
    );
    expect(result.map((group) => group.length)).toEqual([2, 2]);
  });

  it("combines ranked single-character candidates into words", () => {
    expect(combineCharacterCandidates([["你", "他"], ["好", "号"]], 3)).toEqual([
      "你好", "你号", "他好",
    ]);
  });
});
