import { describe, expect, it } from "vitest";

import { dailyWordOffset } from "./daily-word";

describe("dailyWordOffset", () => {
  it("is stable for one local date and selected HSK bands", () => {
    expect(dailyWordOffset("2026-09-25", [1, 2], 50)).toBe(
      dailyWordOffset("2026-09-25", [2, 1], 50),
    );
  });

  it("stays inside the candidate set", () => {
    expect(dailyWordOffset("2026-09-25", [3], 0)).toBe(0);
    expect(dailyWordOffset("2026-09-25", [3], 7)).toBeLessThan(7);
  });
});
