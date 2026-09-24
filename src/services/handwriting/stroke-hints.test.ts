import { describe, expect, it } from "vitest";

import vocabulary from "@/data/hsk-vocabulary.json";
import strokeData from "@/data/hsk12-strokes.json";

const strokes = strokeData as Record<string, string[]>;

const hsk14Characters = new Set(
  vocabulary
    .filter((word) => [1, 2, 3, 4].includes(Number(word.hskBand)))
    .flatMap((word) => Array.from(`${word.simplified}${word.traditional}`))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0x3400 && codePoint <= 0x9fff;
    }),
);

describe("offline HSK 1-4 stroke hints", () => {
  it("bundles ordered paths for common review characters", () => {
    for (const character of ["我", "你", "学", "习", "是", "国"]) {
      expect(strokes[character]?.length, character).toBeGreaterThan(0);
    }
  });

  it("covers every HSK 1-4 character used by the bundled vocabulary", () => {
    const missing = [...hsk14Characters].filter((character) => !strokes[character]?.length);
    expect(missing).toEqual([]);
  });

  it("keeps broad offline coverage", () => {
    expect(Object.keys(strokes).length).toBeGreaterThanOrEqual(1_600);
  });
});
