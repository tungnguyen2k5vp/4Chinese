import { describe, expect, it } from "vitest";

import { getLearnSessionLimit } from "./session-limit";

describe("getLearnSessionLimit", () => {
  it("keeps the daily target separate from one learning session", () => {
    expect(getLearnSessionLimit({ dailyGoal: 30, learnedToday: 10, sessionLimit: 10, available: 100 }))
      .toEqual({ remainingToday: 20, wordCount: 10 });
  });

  it("does not schedule new cards beyond the daily target", () => {
    expect(getLearnSessionLimit({ dailyGoal: 10, learnedToday: 12, sessionLimit: 20, available: 100 }))
      .toEqual({ remainingToday: 0, wordCount: 0 });
  });
});
