import { describe, expect, it } from "vitest";

import {
  getComebackPlan,
  getHomeNextAction,
  normalizeQuickSessionMinutes,
} from "./next-best-action";

describe("personalized home action", () => {
  it("prioritizes due SRS reviews over an active course and new words", () => {
    expect(getHomeNextAction({
      dueCount: 8,
      activeCourse: { id: "hsk1", title: "HSK 1" },
      remainingNewWords: 5,
      hasUnlearnedWords: true,
      studiedMinutes: 0,
      studyGoalMinutes: 30,
    }).kind).toBe("review");
  });

  it("resumes an active course when no cards are due", () => {
    expect(getHomeNextAction({
      dueCount: 0,
      activeCourse: { id: "hsk1", title: "HSK 1" },
      remainingNewWords: 5,
      hasUnlearnedWords: true,
      studiedMinutes: 0,
      studyGoalMinutes: 30,
    })).toMatchObject({ kind: "course", href: "/path/hsk1" });
  });

  it("suggests new vocabulary only when the daily target and supply allow it", () => {
    const input = {
      dueCount: 0,
      remainingNewWords: 4,
      hasUnlearnedWords: true,
      studiedMinutes: 0,
      studyGoalMinutes: 30,
    };
    expect(getHomeNextAction(input).kind).toBe("new-words");
    expect(getHomeNextAction({ ...input, hasUnlearnedWords: false }).kind).toBe("daily-plan");
  });

  it("returns a gentle comeback plan only after a missed calendar day", () => {
    expect(getComebackPlan("2026-09-29", "2026-09-30", 2)).toBeNull();
    expect(getComebackPlan("2026-09-27", "2026-09-30", 2)).toMatchObject({
      daysAway: 3,
      minutes: 5,
      title: "Chào mừng bạn quay lại",
    });
    expect(getComebackPlan("not-a-date", "2026-09-30", 0)).toBeNull();
  });

  it("accepts only supported quick-session durations", () => {
    expect([3, 5, 10].map(normalizeQuickSessionMinutes)).toEqual([3, 5, 10]);
    expect(normalizeQuickSessionMinutes("25")).toBeNull();
    expect(normalizeQuickSessionMinutes(["5", "10"])).toBe(5);
  });
});
