import { describe, expect, it } from "vitest";

import { getLearnSessionLimit } from "./session-limit";

describe("getLearnSessionLimit", () => {
  it("allows 100 new cards and subtracts words already learned today", () => {
    expect(getLearnSessionLimit({ dailyGoal: 100, learnedToday: 0, sessionLimit: 100, available: 150 })).toEqual({ remainingToday: 100, wordCount: 100 });
    expect(getLearnSessionLimit({ dailyGoal: 100, learnedToday: 75, sessionLimit: 100, available: 150 })).toEqual({ remainingToday: 25, wordCount: 25 });
  });
  it("keeps the daily target separate from one learning session", () => {
    expect(getLearnSessionLimit({ dailyGoal: 30, learnedToday: 10, sessionLimit: 10, available: 100 }))
      .toEqual({ remainingToday: 20, wordCount: 10 });
  });

  it("does not schedule new cards beyond the daily target", () => {
    expect(getLearnSessionLimit({ dailyGoal: 10, learnedToday: 12, sessionLimit: 20, available: 100 }))
      .toEqual({ remainingToday: 0, wordCount: 0 });
  });
});
