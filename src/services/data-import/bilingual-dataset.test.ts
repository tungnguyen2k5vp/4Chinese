import { describe, expect, it } from "vitest";

import vocabulary from "@/data/hsk-vocabulary.json";

describe("generated bilingual vocabulary", () => {
  it("selects the common HSK sense instead of an unrelated surname form", () => {
    const white = vocabulary.find((word) => word.simplified === "白" && word.hskBand === 1);
    const compare = vocabulary.find((word) => word.simplified === "比" && word.hskBand === 1);

    expect(white?.meaningsVi[0]).toBe("Trắng");
    expect(white?.meaningsEn[0]).toBe("White");
    expect(compare?.meaningsVi[0]).toBe("so, so v\u1edbi");
    expect(compare?.meaningsEn[0]).toBe("(prep) than\n(v) compare");
  });

  it("has an English translation for every HSK 1-2 entry", () => {
    const beginnerWords = vocabulary.filter((word) => word.hskBand === 1 || word.hskBand === 2);
    expect(beginnerWords.length).toBeGreaterThan(1_200);
    expect(beginnerWords.every((word) => word.meaningsEn.length > 0)).toBe(true);
  });
});
