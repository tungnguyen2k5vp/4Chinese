import { describe, expect, it } from "vitest";

import { calculateStreak, toLocalDateKey } from "./calendar";

describe("local study calendar", () => {
  it("uses the local calendar date instead of UTC", () => {
    const localMidnight = new Date(2026, 8, 24, 0, 3);
    expect(toLocalDateKey(localMidnight)).toBe("2026-09-24");
  });

  it("starts a new day at local midnight", () => {
    const now = new Date(2026, 8, 24, 0, 3);
    expect(calculateStreak(["2026-09-23"], now)).toBe(1);
    expect(calculateStreak(["2026-09-22", "2026-09-23"], now)).toBe(2);
  });

  it("does not count a gap as part of the streak", () => {
    const now = new Date(2026, 8, 24, 12);
    expect(calculateStreak(["2026-09-21", "2026-09-23"], now)).toBe(1);
  });
});
