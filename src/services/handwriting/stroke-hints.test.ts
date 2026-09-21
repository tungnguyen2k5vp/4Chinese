import { describe, expect, it } from "vitest";

import strokeData from "@/data/hsk12-strokes.json";

const strokes = strokeData as Record<string, string[]>;

describe("offline HSK 1-2 stroke hints", () => {
  it("bundles ordered paths for common review characters", () => {
    for (const character of ["我", "你", "学", "习", "是", "国"]) {
      expect(strokes[character]?.length, character).toBeGreaterThan(0);
    }
  });

  it("keeps broad offline coverage", () => {
    expect(Object.keys(strokes).length).toBeGreaterThanOrEqual(850);
  });
});
