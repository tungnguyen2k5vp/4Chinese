import { describe, expect, it } from "vitest";

import { buildStudyHeatmap } from "./heatmap";

describe("buildStudyHeatmap", () => {
  it("uses real completed actions and fills local calendar gaps with zero", () => {
    const now = new Date(2026, 8, 25, 0, 3);
    const days = buildStudyHeatmap([
      { date: "2026-09-23", reviewed: 2, newWords: 1 },
      { date: "2026-09-25", reviewed: 9, newWords: 0 },
    ], now, 3);

    expect(days).toEqual([
      expect.objectContaining({ date: "2026-09-23", activity: 3, level: 2 }),
      expect.objectContaining({ date: "2026-09-24", activity: 0, level: 0 }),
      expect.objectContaining({ date: "2026-09-25", activity: 9, level: 4 }),
    ]);
  });
});
